import { PartialType } from '@nestjs/swagger';
import { CreateServiceTierDto } from './create-service-tier.dto.js';

export class UpdateServiceTierDto extends PartialType(CreateServiceTierDto) {}
