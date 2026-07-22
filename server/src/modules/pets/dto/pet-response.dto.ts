import { Pet } from '../../../generated/prisma/client.js';

export class PetResponseDto {
  id!: string;
  ownerId!: string;
  name!: string;
  breed!: string | null;
  sizeId!: number;
  birthDate!: string | null;
  notes!: string | null;
  createdAt!: string;
  updatedAt!: string;

  /** Single source of truth for entity → response mapping (never expose deletedAt etc.). */
  static from(pet: Pet): PetResponseDto {
    return {
      id: pet.id,
      ownerId: pet.ownerId,
      name: pet.name,
      breed: pet.breed,
      sizeId: pet.sizeId,
      birthDate: pet.birthDate?.toISOString() ?? null,
      notes: pet.notes,
      createdAt: pet.createdAt.toISOString(),
      updatedAt: pet.updatedAt.toISOString(),
    };
  }
}
