import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard.js';
import { PermissionsGuard } from './common/auth/permissions.guard.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { MasterDataModule } from './modules/master-data/master-data.module.js';
import { PetsModule } from './modules/pets/pets.module.js';
import { ServicesModule } from './modules/services/services.module.js';
import { ShopSettingsModule } from './modules/shop-settings/shop-settings.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, AuthModule, PetsModule, ServicesModule, MasterDataModule, ShopSettingsModule],
  controllers: [AppController],
  providers: [
    AppService,
    // Order matters: authentication first, then permission checks.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
