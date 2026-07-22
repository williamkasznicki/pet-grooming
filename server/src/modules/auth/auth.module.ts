import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PermissionsService } from './permissions.service.js';

/** Global: JwtAuthGuard (registered as APP_GUARD) needs JwtService + PermissionsService everywhere. */
@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, PermissionsService],
  exports: [JwtModule, PermissionsService],
})
export class AuthModule {}
