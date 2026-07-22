export type ServiceTierResponseDto = {
  id: string;
  serviceId: string;
  sizeId: number;
  priceThb: string;
  durationMin: number;
};

export type ServiceResponseDto = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tiers: ServiceTierResponseDto[];
};
