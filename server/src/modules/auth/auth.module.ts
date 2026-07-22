import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { PermissionsService } from './permissions.service.js';

/** Global: JwtAuthGuard (registered as APP_GUARD) needs JwtService, AuthRepository + PermissionsService everywhere. */
@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, PermissionsService],
  exports: [JwtModule, AuthRepository, PermissionsService],
})
export class AuthModule {}
