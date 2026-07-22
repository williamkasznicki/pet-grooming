export type PetResponseDto = {
  id: string;
  ownerId: string;
  name: string;
  breed: string | null;
  sizeId: number;
  birthDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
