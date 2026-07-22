import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { translatePrismaError } from '../../common/prisma/prisma-error.util.js';
import { Pet } from '../../generated/prisma/client.js';
import { CreatePetDto } from './dto/create-pet.dto.js';
import { PetResponseDto } from './dto/pet-response.dto.js';
import { UpdatePetDto } from './dto/update-pet.dto.js';

@Injectable()
export class PetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PetResponseDto[]> {
    const pets = await this.prisma.pet.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return pets.map((pet) => this.toResponse(pet));
  }

  async findOne(id: string): Promise<PetResponseDto> {
    const pet = await this.prisma.pet.findFirst({ where: { id, deletedAt: null } });
    if (!pet) {
      throw new NotFoundException('Pet not found.');
    }
    return this.toResponse(pet);
  }

  async create(dto: CreatePetDto): Promise<PetResponseDto> {
    await this.ensureActiveSize(dto.sizeId);

    try {
      const pet = await this.prisma.pet.create({
        data: {
          ownerId: dto.ownerId,
          name: dto.name,
          breed: dto.breed,
          sizeId: dto.sizeId,
          birthDate: dto.birthDate,
          notes: dto.notes,
        },
      });
      return this.toResponse(pet);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async update(id: string, dto: UpdatePetDto): Promise<PetResponseDto> {
    await this.ensureExists(id);
    if (dto.sizeId !== undefined) {
      await this.ensureActiveSize(dto.sizeId);
    }

    try {
      const pet = await this.prisma.pet.update({
        where: { id },
        data: {
          ownerId: dto.ownerId,
          name: dto.name,
          breed: dto.breed,
          sizeId: dto.sizeId,
          birthDate: dto.birthDate,
          notes: dto.notes,
        },
      });
      return this.toResponse(pet);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async remove(id: string): Promise<PetResponseDto> {
    await this.ensureExists(id);

    try {
      const pet = await this.prisma.pet.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return this.toResponse(pet);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  private async ensureExists(id: string): Promise<void> {
    const pet = await this.prisma.pet.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!pet) {
      throw new NotFoundException('Pet not found.');
    }
  }

  private async ensureActiveSize(sizeId: number): Promise<void> {
    const size = await this.prisma.mdPetSize.findFirst({ where: { id: sizeId, isActive: true }, select: { id: true } });
    if (!size) {
      throw new BadRequestException('Pet size does not exist or is inactive.');
    }
  }

  private toResponse(pet: Pet): PetResponseDto {
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
