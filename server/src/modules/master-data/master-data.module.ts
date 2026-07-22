import { Module } from '@nestjs/common';
import { MasterDataController } from './master-data.controller.js';
import { MasterDataRepository } from './master-data.repository.js';
import { MasterDataService } from './master-data.service.js';

@Module({
  controllers: [MasterDataController],
  providers: [MasterDataService, MasterDataRepository],
})
export class MasterDataModule {}
