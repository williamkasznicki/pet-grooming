import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthUser } from '../../common/auth/auth.types.js';
import { ErrorMessages } from '../../common/constants/error-messages.constant.js';
import { translatePrismaError } from '../../common/prisma/prisma-error.util.js';
import { CreatePetDto } from './dto/create-pet.dto.js';
import { PetResponseDto } from './dto/pet-response.dto.js';
import { UpdatePetDto } from './dto/update-pet.dto.js';

/**
 * Row-level scoping (docs/RBAC.md): users act on their own pets; the "*"
 * wildcard (super admin) sees and manages all pets.
 */
@Injectable()
export class PetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser): Promise<PetResponseDto[]> {
    const pets = await this.prisma.client.pet.findMany({
      where: this.ownerScope(user),
      orderBy: { createdAt: 'desc' },
    });
    return pets.map((pet) => PetResponseDto.from(pet));
  }

  async findOne(id: string, user: AuthUser): Promise<PetResponseDto> {
    const pet = await this.prisma.client.pet.findFirst({ where: { id, ...this.ownerScope(user) } });
    if (!pet) {
      throw new NotFoundException(ErrorMessages.PET_NOT_FOUND);
    }
    return PetResponseDto.from(pet);
  }

  async create(dto: CreatePetDto, user: AuthUser): Promise<PetResponseDto> {
    await this.ensureActiveSize(dto.sizeId);

    try {
      const pet = await this.prisma.client.pet.create({
        data: {
          ownerId: user.id,
          name: dto.name,
          breed: dto.breed,
          sizeId: dto.sizeId,
          birthDate: dto.birthDate,
          notes: dto.notes,
        },
      });
      return PetResponseDto.from(pet);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async update(id: string, dto: UpdatePetDto, user: AuthUser): Promise<PetResponseDto> {
    await this.ensureExists(id, user);
    if (dto.sizeId !== undefined) {
      await this.ensureActiveSize(dto.sizeId);
    }

    try {
      const pet = await this.prisma.client.pet.update({
        where: { id },
        data: {
          name: dto.name,
          breed: dto.breed,
          sizeId: dto.sizeId,
          birthDate: dto.birthDate,
          notes: dto.notes,
        },
      });
      return PetResponseDto.from(pet);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async remove(id: string, user: AuthUser): Promise<PetResponseDto> {
    await this.ensureExists(id, user);

    try {
      const pet = await this.prisma.client.pet.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return PetResponseDto.from(pet);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  private ownerScope(user: AuthUser): { ownerId?: string } {
    return user.permissions.has('*') ? {} : { ownerId: user.id };
  }

  private async ensureExists(id: string, user: AuthUser): Promise<void> {
    const pet = await this.prisma.client.pet.findFirst({
      where: { id, ...this.ownerScope(user) },
      select: { id: true },
    });
    if (!pet) {
      throw new NotFoundException(ErrorMessages.PET_NOT_FOUND);
    }
  }

  private async ensureActiveSize(sizeId: number): Promise<void> {
    const size = await this.prisma.client.mdPetSize.findFirst({
      where: { id: sizeId, isActive: true },
      select: { id: true },
    });
    if (!size) {
      throw new BadRequestException(ErrorMessages.PET_SIZE_INVALID);
    }
  }
}
