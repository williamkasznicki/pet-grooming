import { ApiProperty } from '@nestjs/swagger';
import { Service, ServiceTier } from '../../../generated/prisma/client.js';

export type ServiceWithTiers = Service & { tiers: ServiceTier[] };

export class ServiceTierResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  serviceId!: string;

  @ApiProperty({ description: 'MdPetSize id' })
  sizeId!: number;

  @ApiProperty({ description: 'Price in THB', example: '590.00' })
  priceThb!: string;

  @ApiProperty()
  durationMin!: number;

  static from(tier: ServiceTier): ServiceTierResponseDto {
    return {
      id: tier.id,
      serviceId: tier.serviceId,
      sizeId: tier.sizeId,
      priceThb: tier.priceThb.toString(),
      durationMin: tier.durationMin,
    };
  }
}

export class ServiceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Thai display name (falls back to name)' })
  nameTh!: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Thai description (falls back to description)' })
  descriptionTh!: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Preset icon key (see SERVICE_ICONS)' })
  icon!: string | null;

  @ApiProperty()
  active!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ type: [ServiceTierResponseDto] })
  tiers!: ServiceTierResponseDto[];

  static from(service: ServiceWithTiers): ServiceResponseDto {
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      nameTh: service.nameTh,
      descriptionTh: service.descriptionTh,
      icon: service.icon,
      active: service.active,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
      tiers: service.tiers.map((tier) => ServiceTierResponseDto.from(tier)),
    };
  }
}
