import { Service, ServiceTier } from '../../../generated/prisma/client.js';

export type ServiceWithTiers = Service & { tiers: ServiceTier[] };

export class ServiceTierResponseDto {
  id!: string;
  serviceId!: string;
  sizeId!: number;
  priceThb!: string;
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
  id!: string;
  name!: string;
  description!: string | null;
  active!: boolean;
  createdAt!: string;
  updatedAt!: string;
  tiers!: ServiceTierResponseDto[];

  static from(service: ServiceWithTiers): ServiceResponseDto {
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      active: service.active,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
      tiers: service.tiers.map((tier) => ServiceTierResponseDto.from(tier)),
    };
  }
}
