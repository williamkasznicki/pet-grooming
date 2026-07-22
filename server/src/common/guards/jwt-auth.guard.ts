import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ErrorMessages } from '../constants/error-messages.constant.js';
import { AuthRepository } from '../../modules/auth/auth.repository.js';
import { PermissionsService } from '../../modules/auth/permissions.service.js';
import { IS_PUBLIC_KEY } from '../decorators/auth.decorators.js';
import { AuthenticatedRequest } from '../types/auth.types.js';

type AccessTokenPayload = { sub: string };

/** Global guard: verifies the Bearer access token and attaches req.user. Skipped for @Public routes. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly authRepository: AuthRepository,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException(ErrorMessages.UNAUTHENTICATED);
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET!,
      });
    } catch {
      throw new UnauthorizedException(ErrorMessages.INVALID_TOKEN);
    }

    const user = await this.authRepository.findUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException(ErrorMessages.INVALID_TOKEN);
    }

    const permissions = await this.permissionsService.getPermissions(user.id);
    (request as AuthenticatedRequest).user = { ...user, permissions };
    return true;
  }

  private extractBearerToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
