import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller.js';
import { PermissionsControllerService } from './permissions.service.js';

@Module({
  controllers: [PermissionsController],
  providers: [PermissionsControllerService],
})
export class PermissionsModule {}
