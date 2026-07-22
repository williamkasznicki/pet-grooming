import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller.js';
import { PermissionsRepository } from './permissions.repository.js';
import { PermissionsControllerService } from './permissions.service.js';

@Module({
  controllers: [PermissionsController],
  providers: [PermissionsControllerService, PermissionsRepository],
})
export class PermissionsModule {}
