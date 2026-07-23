import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Public } from '../../common/decorators/auth.decorators.js';
import type { AuthUser } from '../../common/types/auth.types.js';
import { AuthService } from './auth.service.js';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import {
  ForgotPasswordDto,
  ForgotPasswordResultDto,
  LoginResultDto,
  ResetPasswordDto,
  VerifyLoginOtpDto,
} from './dto/otp.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiCreatedResponse({ type: AuthResponseDto })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LoginResultDto, description: 'Tokens, or an OTP challenge when 2FA is on' })
  login(@Body() dto: LoginDto): Promise<LoginResultDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('login/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto, description: 'Verify the emailed login code, get tokens' })
  verifyLoginOtp(@Body() dto: VerifyLoginOtpDto): Promise<AuthResponseDto> {
    return this.authService.verifyLoginOtp(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ForgotPasswordResultDto, description: 'Always ok; emails a reset code if the account exists' })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<ForgotPasswordResultDto> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto, description: 'Rotates the refresh token' })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body() dto: RefreshTokenDto): Promise<void> {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOkResponse({ type: AuthUserDto })
  me(@CurrentUser() user: AuthUser): Promise<AuthUserDto> {
    return this.authService.me(user.id);
  }
}
