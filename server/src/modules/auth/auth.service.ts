import { createHash, randomBytes } from 'node:crypto';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { ErrorMessages } from '../../common/constants/error-messages.constant.js';
import { translatePrismaError } from '../../common/prisma/prisma-error.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { PermissionsService } from './permissions.service.js';

const DEFAULT_ROLE = 'Client';

/** "15m" | "12h" | "30d" | "45s" → milliseconds. */
function ttlToMs ( ttl: string ): number {
  const match = /^(\d+)([smhd])$/.exec( ttl );
  if ( !match ) throw new Error( `Invalid TTL format: ${ ttl }` );
  const value = Number( match[ 1 ] );
  const unit = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[ match[ 2 ] as 's' | 'm' | 'h' | 'd' ];
  return value * unit;
}

function sha256 ( value: string ): string {
  return createHash( 'sha256' ).update( value ).digest( 'hex' );
}

@Injectable()
export class AuthService {
  constructor (
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly permissionsService: PermissionsService,
  ) { }

  async register ( dto: RegisterDto ): Promise<AuthResponseDto> {
    const passwordHash = await argon2.hash( dto.password );

    try {
      const user = await this.prisma.client.user.create( {
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          name: dto.name,
          phone: dto.phone,
          userRoles: { create: { role: { connect: { name: DEFAULT_ROLE } } } },
        },
        select: { id: true, email: true, name: true },
      } );
      return this.buildAuthResponse( user );
    } catch ( error ) {
      // P2002 on email → friendlier message than the generic conflict text
      if ( this.isUniqueViolation( error ) ) {
        throw new ConflictException( ErrorMessages.EMAIL_TAKEN );
      }
      translatePrismaError( error );
    }
  }

  async login ( dto: LoginDto ): Promise<AuthResponseDto> {
    const user = await this.prisma.client.user.findFirst( {
      where: { email: dto.email.toLowerCase() },
      select: { id: true, email: true, name: true, passwordHash: true },
    } );
    if ( !user || !( await argon2.verify( user.passwordHash, dto.password ) ) ) {
      throw new UnauthorizedException( ErrorMessages.INVALID_CREDENTIALS );
    }
    return this.buildAuthResponse( { id: user.id, email: user.email, name: user.name } );
  }

  /** Rotates the refresh token: the presented token is revoked and a new pair is issued. */
  async refresh ( refreshToken: string ): Promise<AuthResponseDto> {
    const tokenHash = sha256( refreshToken );
    const stored = await this.prisma.client.refreshToken.findFirst( {
      where: { tokenHash },
      select: { id: true, revokedAt: true, expiresAt: true, user: { select: { id: true, email: true, name: true } } },
    } );
    if ( !stored || stored.revokedAt || stored.expiresAt < new Date() ) {
      throw new UnauthorizedException( ErrorMessages.INVALID_TOKEN );
    }

    await this.prisma.client.refreshToken.update( {
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    } );
    return this.buildAuthResponse( stored.user );
  }

  async logout ( refreshToken: string ): Promise<void> {
    // Idempotent: revoking an unknown/already-revoked token is a no-op.
    await this.prisma.client.refreshToken.updateMany( {
      where: { tokenHash: sha256( refreshToken ), revokedAt: null },
      data: { revokedAt: new Date() },
    } );
  }

  async me ( userId: string ): Promise<AuthUserDto> {
    const user = await this.prisma.client.user.findFirstOrThrow( {
      where: { id: userId },
      select: { id: true, email: true, name: true },
    } );
    return this.toAuthUser( user );
  }

  private async buildAuthResponse ( user: { id: string; email: string; name: string } ): Promise<AuthResponseDto> {
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: process.env.JWT_ACCESS_SECRET!,
        expiresIn: Math.floor( ttlToMs( process.env.JWT_ACCESS_TTL ?? '15m' ) / 1_000 ), // seconds
      },
    );

    const refreshToken = randomBytes( 48 ).toString( 'base64url' );
    await this.prisma.client.refreshToken.create( {
      data: {
        userId: user.id,
        tokenHash: sha256( refreshToken ),
        expiresAt: new Date( Date.now() + ttlToMs( process.env.JWT_REFRESH_TTL ?? '30d' ) ),
      },
    } );

    return { accessToken, refreshToken, user: await this.toAuthUser( user ) };
  }

  private async toAuthUser ( user: { id: string; email: string; name: string } ): Promise<AuthUserDto> {
    const [ userRoles, permissions ] = await Promise.all( [
      this.prisma.client.userRole.findMany( {
        where: { userId: user.id },
        select: { role: { select: { name: true } } },
      } ),
      this.permissionsService.getPermissions( user.id ),
    ] );
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: userRoles.map( ( ur ) => ur.role.name ),
      permissions: [ ...permissions ],
    };
  }

  private isUniqueViolation ( error: unknown ): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
