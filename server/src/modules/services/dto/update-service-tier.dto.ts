import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceTierDto } from './create-service-tier.dto.js';

export class UpdateServiceTierDto extends PartialType(CreateServiceTierDto) {}
