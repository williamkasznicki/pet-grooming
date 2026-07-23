import { Module } from '@nestjs/common';
import { PetsController } from './pets.controller.js';
import { PetsRepository } from './pets.repository.js';
import { PetsService } from './pets.service.js';

@Module({
  controllers: [PetsController],
  providers: [PetsService, PetsRepository],
  exports: [PetsService],
})
export class PetsModule {}
