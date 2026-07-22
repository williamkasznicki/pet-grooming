import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { AuthenticatedRequest, AuthUser } from '../types/auth.types.js';

export const IS_PUBLIC_KEY = 'isPublic';

export const Public = () => SetMetadata( IS_PUBLIC_KEY, true );

export const PERMISSIONS_KEY = 'requiredPermissions';

export const RequirePermissions = ( ...permissions: string[] ) => SetMetadata( PERMISSIONS_KEY, permissions );

export const CurrentUser = createParamDecorator( ( _data: unknown, ctx: ExecutionContext ): AuthUser => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user;
} );
