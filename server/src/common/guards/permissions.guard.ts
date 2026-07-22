import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorMessages } from '../constants/error-messages.constant.js';
import { PERMISSIONS_KEY } from '../decorators/auth.decorators.js';
import { AuthenticatedRequest, hasPermission } from '../types/auth.types.js';

/** Global guard: enforces @RequirePermissions metadata. Runs after JwtAuthGuard. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // Public routes never reach here with metadata; missing user means misconfiguration — deny.
    if (!user || !required.every((permission) => hasPermission(user, permission))) {
      throw new ForbiddenException(ErrorMessages.FORBIDDEN);
    }
    return true;
  }
}
