import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AvailabilityModule } from './modules/availability/availability.module.js';
import { MailModule } from './modules/mail/mail.module.js';
import { MasterDataModule } from './modules/master-data/master-data.module.js';
import { PermissionsModule } from './modules/permissions/permissions.module.js';
import { PetsModule } from './modules/pets/pets.module.js';
import { RolesModule } from './modules/roles/roles.module.js';
import { ServicesModule } from './modules/services/services.module.js';
import { ShopSettingsModule } from './modules/shop-settings/shop-settings.module.js';
import { StaffModule } from './modules/staff/staff.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MailModule,
    PetsModule,
    ServicesModule,
    MasterDataModule,
    ShopSettingsModule,
    StaffModule,
    AvailabilityModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Order matters: authentication first, then permission checks.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
