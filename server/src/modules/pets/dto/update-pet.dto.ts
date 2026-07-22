import { PartialType } from '@nestjs/swagger';
import { CreatePetDto } from './create-pet.dto.js';

export class UpdatePetDto extends PartialType(CreatePetDto) {}
