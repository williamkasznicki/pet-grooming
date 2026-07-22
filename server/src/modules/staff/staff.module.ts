import { Module } from '@nestjs/common';
import { ShopTimeOffController } from './shop-time-off.controller.js';
import { StaffController } from './staff.controller.js';
import { StaffService } from './staff.service.js';

@Module({
  controllers: [StaffController, ShopTimeOffController],
  providers: [StaffService],
})
export class StaffModule {}
