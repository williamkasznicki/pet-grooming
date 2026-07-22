import { createHash, randomBytes } from 'node:crypto';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { add, isBefore, type Duration } from 'date-fns';
import { now } from '../../common/utils/clock.util.js';
import { hashPassword, verifyPassword } from '../../common/utils/password.util.js';
import { ErrorMessages } from '../../common/constants/error-messages.constant.js';
import { translatePrismaError } from '../../common/utils/prisma-error.util.js';
import { AuthRepository, AuthUserRecord } from './auth.repository.js';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { PermissionsService } from './permissions.service.js';

const DEFAULT_ROLE = 'Client';

/** "15m" | "12h" | "30d" | "45s" → date-fns Duration. */
function ttlToDuration ( ttl: string ): Duration {
  const match = /^(\d+)([smhd])$/.exec( ttl );
  if ( !match ) throw new Error( `Invalid TTL format: ${ ttl }` );
  const value = Number( match[ 1 ] );
  const unit = { s: 'seconds', m: 'minutes', h: 'hours', d: 'days' }[ match[ 2 ] as 's' | 'm' | 'h' | 'd' ] as keyof Duration;
  return { [ unit ]: value };
}

/** date-fns Duration → whole seconds (for JWT expiresIn). */
function durationToSeconds ( duration: Duration ): number {
  const anchor = now();
  return Math.floor( ( add( anchor, duration ).getTime() - anchor.getTime() ) / 1_000 );
}

function sha256 ( value: string ): string {
  return createHash( 'sha256' ).update( value ).digest( 'hex' );
}

@Injectable()
export class AuthService {
  constructor (
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly permissionsService: PermissionsService,
  ) { }

  async register ( dto: RegisterDto ): Promise<AuthResponseDto> {
    const passwordHash = await hashPassword( dto.password );

    try {
      const user = await this.authRepository.createUserWithRole(
        {
          email: dto.email.toLowerCase(),
          passwordHash,
          name: dto.name,
          phone: dto.phone,
        },
        DEFAULT_ROLE,
      );
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
    const user = await this.authRepository.findUserByEmailWithHash( dto.email.toLowerCase() );
    if ( !user || !( await verifyPassword( user.passwordHash, dto.password ) ) ) {
      throw new UnauthorizedException( ErrorMessages.INVALID_CREDENTIALS );
    }
    return this.buildAuthResponse( { id: user.id, email: user.email, name: user.name } );
  }

  /** Rotates the refresh token: the presented token is revoked and a new pair is issued. */
  async refresh ( refreshToken: string ): Promise<AuthResponseDto> {
    const stored = await this.authRepository.findRefreshTokenByHash( sha256( refreshToken ) );
    if ( !stored || stored.revokedAt || isBefore( stored.expiresAt, now() ) ) {
      throw new UnauthorizedException( ErrorMessages.INVALID_TOKEN );
    }

    await this.authRepository.revokeRefreshTokenById( stored.id );
    return this.buildAuthResponse( stored.user );
  }

  async logout ( refreshToken: string ): Promise<void> {
    await this.authRepository.revokeActiveRefreshTokenByHash( sha256( refreshToken ) );
  }

  async me ( userId: string ): Promise<AuthUserDto> {
    const user = await this.authRepository.findUserById( userId );
    if ( !user ) {
      throw new UnauthorizedException( ErrorMessages.INVALID_TOKEN );
    }
    return this.toAuthUser( user );
  }

  private async buildAuthResponse ( user: { id: string; email: string; name: string } ): Promise<AuthResponseDto> {
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: process.env.JWT_ACCESS_SECRET!,
        expiresIn: durationToSeconds( ttlToDuration( process.env.JWT_ACCESS_TTL ?? '15m' ) ),
      },
    );

    const refreshToken = randomBytes( 48 ).toString( 'base64url' );
    await this.authRepository.createRefreshToken(
      user.id,
      sha256( refreshToken ),
      add( now(), ttlToDuration( process.env.JWT_REFRESH_TTL ?? '30d' ) ),
    );

    return { accessToken, refreshToken, user: await this.toAuthUser( user ) };
  }

  private async toAuthUser ( user: AuthUserRecord ): Promise<AuthUserDto> {
    const [ roles, permissions ] = await Promise.all( [
      this.authRepository.findUserRoleNames( user.id ),
      this.permissionsService.getPermissions( user.id ),
    ] );
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles,
      permissions: [ ...permissions ],
    };
  }

  private isUniqueViolation ( error: unknown ): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
