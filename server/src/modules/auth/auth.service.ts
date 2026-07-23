import { createHash, randomBytes } from 'node:crypto';
import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { add, isBefore, type Duration } from 'date-fns';
import { now } from '../../common/utils/clock.util.js';
import { hashPassword, verifyPassword } from '../../common/utils/password.util.js';
import { ErrorMessages } from '../../common/constants/error-messages.constant.js';
import { translatePrismaError } from '../../common/utils/prisma-error.util.js';
import { MailService } from '../mail/mail.service.js';
import { AuthRepository, AuthUserRecord, VerificationCodeWithUser } from './auth.repository.js';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import {
  ForgotPasswordDto,
  ForgotPasswordResultDto,
  LoginResultDto,
  ResetPasswordDto,
  VerifyLoginOtpDto,
} from './dto/otp.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { generateOtp, hashOtp, OTP_MAX_ATTEMPTS, OTP_TTL_MINUTES } from './otp.util.js';
import { PermissionsService } from './permissions.service.js';

const DEFAULT_ROLE = 'Client';

/** Login 2FA is on unless explicitly disabled. */
function isOtpEnabled(): boolean {
  return process.env.LOGIN_OTP_ENABLED !== 'false';
}

/** Dev-only OTP echo — double-gated, never active in production. */
function devEchoCode(code: string): string | null {
  return process.env.NODE_ENV !== 'production' && process.env.AUTH_DEV_ECHO_OTP === '1' ? code : null;
}

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
  private readonly logger = new Logger( AuthService.name );

  constructor (
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly permissionsService: PermissionsService,
    private readonly mailService: MailService,
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

  /**
   * Step 1 of login: verify the password. With 2FA on, email a one-time code
   * and return a challenge (no tokens yet). With 2FA off, return tokens now.
   */
  async login ( dto: LoginDto ): Promise<LoginResultDto> {
    const user = await this.authRepository.findUserByEmailWithHash( dto.email.toLowerCase() );
    if ( !user || !( await verifyPassword( user.passwordHash, dto.password ) ) ) {
      throw new UnauthorizedException( ErrorMessages.INVALID_CREDENTIALS );
    }

    const account = { id: user.id, email: user.email, name: user.name };
    if ( !isOtpEnabled() ) {
      return { requiresOtp: false, challengeId: null, auth: await this.buildAuthResponse( account ), devCode: null };
    }

    const { code, challengeId } = await this.issueCode( account.id, 'login' );
    // Non-fatal: if delivery fails the challenge still stands (user can resend);
    // never let a mail hiccup turn a valid login into a 500.
    await this.mailService
      .sendLoginOtp( { to: account.email, name: account.name, code, expiresInMinutes: OTP_TTL_MINUTES } )
      .catch( ( error: unknown ) => this.logger.error( `Login OTP email failed: ${ String( error ) }` ) );
    return { requiresOtp: true, challengeId, auth: null, devCode: devEchoCode( code ) };
  }

  /** Step 2 of login: verify the emailed code, then issue tokens. */
  async verifyLoginOtp ( dto: VerifyLoginOtpDto ): Promise<AuthResponseDto> {
    const record = await this.consumeCode( dto.challengeId, 'login', dto.code );
    await this.authRepository.markEmailVerified( record.userId );
    return this.buildAuthResponse( record.user );
  }

  /**
   * Forgot password: always returns ok (never reveals whether the email
   * exists). When it does, email a reset code.
   */
  async forgotPassword ( dto: ForgotPasswordDto ): Promise<ForgotPasswordResultDto> {
    const user = await this.authRepository.findUserByEmail( dto.email.toLowerCase() );
    if ( !user ) {
      return { ok: true, devCode: null };
    }
    const { code } = await this.issueCode( user.id, 'reset' );
    await this.mailService
      .sendPasswordReset( { to: user.email, name: user.name, code, expiresInMinutes: OTP_TTL_MINUTES } )
      .catch( ( error: unknown ) => this.logger.error( `Password reset email failed: ${ String( error ) }` ) );
    return { ok: true, devCode: devEchoCode( code ) };
  }

  /** Reset password with the emailed code; revokes every existing session. */
  async resetPassword ( dto: ResetPasswordDto ): Promise<void> {
    const user = await this.authRepository.findUserByEmail( dto.email.toLowerCase() );
    if ( !user ) {
      // Same generic error as a wrong code — no account enumeration.
      throw new UnauthorizedException( ErrorMessages.OTP_INVALID );
    }
    const record = await this.consumeNewestCode( user.id, 'reset', dto.code );
    const passwordHash = await hashPassword( dto.password );
    await this.authRepository.updatePasswordHash( record.userId, passwordHash );
    await this.authRepository.revokeAllRefreshTokens( record.userId );
    this.permissionsService.invalidate( record.userId );
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

  /** Create a fresh 6-digit code (hashed) for a purpose; returns the plaintext + challenge id. */
  private async issueCode ( userId: string, purpose: 'login' | 'reset' ): Promise<{ code: string; challengeId: string }> {
    const code = generateOtp();
    const challengeId = await this.authRepository.createVerificationCode(
      userId,
      purpose,
      hashOtp( code ),
      add( now(), { minutes: OTP_TTL_MINUTES } ),
    );
    return { code, challengeId };
  }

  /** Validate a code by challenge id (login flow). Consumes it on success. */
  private async consumeCode ( challengeId: string, purpose: string, code: string ): Promise<VerificationCodeWithUser> {
    const record = await this.authRepository.findVerificationCode( challengeId );
    return this.validateAndConsume( record, purpose, code );
  }

  /** Validate the newest code for a user + purpose (reset flow — challenge id is not exposed to the client). */
  private async consumeNewestCode ( userId: string, purpose: string, code: string ): Promise<VerificationCodeWithUser> {
    const record = await this.authRepository.findNewestVerificationCode( userId, purpose );
    return this.validateAndConsume( record, purpose, code );
  }

  private async validateAndConsume (
    record: VerificationCodeWithUser | null,
    purpose: string,
    code: string,
  ): Promise<VerificationCodeWithUser> {
    if ( !record || record.purpose !== purpose || record.consumedAt || isBefore( record.expiresAt, now() ) ) {
      throw new UnauthorizedException( ErrorMessages.OTP_INVALID );
    }
    if ( record.attempts >= OTP_MAX_ATTEMPTS ) {
      throw new UnauthorizedException( ErrorMessages.OTP_TOO_MANY_ATTEMPTS );
    }
    if ( hashOtp( code ) !== record.codeHash ) {
      await this.authRepository.incrementVerificationAttempts( record.id );
      throw new UnauthorizedException( ErrorMessages.OTP_INVALID );
    }
    await this.authRepository.consumeVerificationCode( record.id );
    return record;
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
