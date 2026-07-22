import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../common/types/auth.types.js';
import { ErrorMessages } from '../../common/constants/error-messages.constant.js';
import { translatePrismaError } from '../../common/utils/prisma-error.util.js';
import { ownerScope } from '../../common/utils/scope.util.js';
import { CreatePetDto } from './dto/create-pet.dto.js';
import { PetResponseDto } from './dto/pet-response.dto.js';
import { UpdatePetDto } from './dto/update-pet.dto.js';
import { PetsRepository } from './pets.repository.js';

/**
 * Row-level scoping (docs/RBAC.md): users act on their own pets; the "*"
 * wildcard (super admin) sees and manages all pets.
 */
@Injectable()
export class PetsService {
  constructor(private readonly petsRepository: PetsRepository) {}

  async findAll(user: AuthUser): Promise<PetResponseDto[]> {
    const pets = await this.petsRepository.findManyScoped(ownerScope(user));
    return pets.map((pet) => PetResponseDto.from(pet));
  }

  async findOne(id: string, user: AuthUser): Promise<PetResponseDto> {
    const pet = await this.petsRepository.findByIdScoped(id, ownerScope(user));
    if (!pet) {
      throw new NotFoundException(ErrorMessages.PET_NOT_FOUND);
    }
    return PetResponseDto.from(pet);
  }

  async create(dto: CreatePetDto, user: AuthUser): Promise<PetResponseDto> {
    await this.ensureActiveSize(dto.sizeId);

    try {
      const pet = await this.petsRepository.create({
        ownerId: user.id,
        name: dto.name,
        breed: dto.breed,
        sizeId: dto.sizeId,
        birthDate: dto.birthDate,
        notes: dto.notes,
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
      const pet = await this.petsRepository.update(id, {
        name: dto.name,
        breed: dto.breed,
        sizeId: dto.sizeId,
        birthDate: dto.birthDate,
        notes: dto.notes,
      });
      return PetResponseDto.from(pet);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async remove(id: string, user: AuthUser): Promise<PetResponseDto> {
    await this.ensureExists(id, user);

    try {
      const pet = await this.petsRepository.softDelete(id);
      return PetResponseDto.from(pet);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  private async ensureExists(id: string, user: AuthUser): Promise<void> {
    if (!(await this.petsRepository.existsScoped(id, ownerScope(user)))) {
      throw new NotFoundException(ErrorMessages.PET_NOT_FOUND);
    }
  }

  private async ensureActiveSize(sizeId: number): Promise<void> {
    if (!(await this.petsRepository.activeSizeExists(sizeId))) {
      throw new BadRequestException(ErrorMessages.PET_SIZE_INVALID);
    }
  }
}
