import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { AuthResponseDto } from './auth-response.dto.js';

/**
 * Result of POST /auth/login. When email 2FA is on (LOGIN_OTP_ENABLED),
 * `requiresOtp` is true and `auth` is null: the client must call
 * /auth/login/verify with `challengeId` + the emailed code. When 2FA is off,
 * `auth` carries the tokens directly. `devCode` is populated ONLY in non-prod
 * with AUTH_DEV_ECHO_OTP=1 (local testing without a real inbox).
 */
export class LoginResultDto {
  @ApiProperty()
  requiresOtp!: boolean;

  @ApiProperty({ type: String, nullable: true, description: 'Verification challenge id (when requiresOtp)' })
  challengeId!: string | null;

  @ApiProperty({ type: AuthResponseDto, nullable: true, description: 'Tokens (when 2FA is off)' })
  auth!: AuthResponseDto | null;

  @ApiProperty({ type: String, nullable: true, description: 'Dev-only echoed OTP; never set in production' })
  devCode!: string | null;
}

export class VerifyLoginOtpDto {
  @ApiProperty({ description: 'challengeId from the login response' })
  @IsString()
  @MaxLength(64)
  challengeId!: string;

  @ApiProperty({ example: '042317' })
  @IsString()
  @Length(6, 6)
  code!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'owner@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class ForgotPasswordResultDto {
  @ApiProperty({ description: 'Always true — never reveals whether the email exists' })
  ok!: boolean;

  @ApiProperty({ type: String, nullable: true, description: 'Dev-only echoed OTP; never set in production' })
  devCode!: string | null;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'owner@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: '042317' })
  @IsString()
  @Length(6, 6)
  code!: string;

  @ApiProperty({ example: 'N3w-secure-pass' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
