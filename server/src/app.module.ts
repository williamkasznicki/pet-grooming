import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { MasterDataModule } from './modules/master-data/master-data.module.js';
import { PetsModule } from './modules/pets/pets.module.js';
import { ServicesModule } from './modules/services/services.module.js';
import { ShopSettingsModule } from './modules/shop-settings/shop-settings.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, PetsModule, ServicesModule, MasterDataModule, ShopSettingsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
