import { Injectable } from '@nestjs/common';
import { Permission } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class PermissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyOrdered(): Promise<Permission[]> {
    return this.prisma.client.permission.findMany({
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
    });
  }
}
