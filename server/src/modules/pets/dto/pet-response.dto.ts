import { ApiProperty } from '@nestjs/swagger';
import { Pet } from '../../../generated/prisma/client.js';

export class PetResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  ownerId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  breed!: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Weight in kg', example: '7.5' })
  weightKg!: string | null;

  @ApiProperty({ description: 'Derived MdPetSize (weight band) id' })
  sizeId!: number;

  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  birthDate!: string | null;

  @ApiProperty({ type: String, nullable: true })
  notes!: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Relative photo URL under /uploads' })
  photoUrl!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  /** Single source of truth for entity → response mapping (never expose deletedAt etc.). */
  static from(pet: Pet): PetResponseDto {
    return {
      id: pet.id,
      ownerId: pet.ownerId,
      name: pet.name,
      breed: pet.breed,
      weightKg: pet.weightKg?.toString() ?? null,
      sizeId: pet.sizeId,
      birthDate: pet.birthDate?.toISOString() ?? null,
      notes: pet.notes,
      photoUrl: pet.photoUrl,
      createdAt: pet.createdAt.toISOString(),
      updatedAt: pet.updatedAt.toISOString(),
    };
  }
}
