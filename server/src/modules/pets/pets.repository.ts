import { Injectable } from '@nestjs/common';
import { now } from '../../common/utils/clock.util.js';
import { OwnerScope } from '../../common/utils/scope.util.js';
import { Pet, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * REFERENCE REPOSITORY (API-CONVENTIONS.md): all prisma.client access for the
 * module lives here, behind domain-named methods. Repositories return Prisma
 * entities and throw raw Prisma errors — services own validation, error
 * translation, and DTO mapping. No HTTP concepts in this layer.
 */
@Injectable()
export class PetsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyScoped(scope: OwnerScope): Promise<Pet[]> {
    return this.prisma.client.pet.findMany({
      where: scope,
      orderBy: { createdAt: 'desc' },
    });
  }

  findByIdScoped(id: string, scope: OwnerScope): Promise<Pet | null> {
    return this.prisma.client.pet.findFirst({ where: { id, ...scope } });
  }

  async existsScoped(id: string, scope: OwnerScope): Promise<boolean> {
    const pet = await this.prisma.client.pet.findFirst({ where: { id, ...scope }, select: { id: true } });
    return pet !== null;
  }

  create(data: Prisma.PetUncheckedCreateInput): Promise<Pet> {
    return this.prisma.client.pet.create({ data });
  }

  update(id: string, data: Prisma.PetUncheckedUpdateInput): Promise<Pet> {
    return this.prisma.client.pet.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Pet> {
    return this.prisma.client.pet.update({ where: { id }, data: { deletedAt: now() } });
  }

  async activeSizeExists(sizeId: number): Promise<boolean> {
    const size = await this.prisma.client.mdPetSize.findFirst({
      where: { id: sizeId, isActive: true },
      select: { id: true },
    });
    return size !== null;
  }
}
