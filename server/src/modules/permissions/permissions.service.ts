import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PermissionResponseDto } from './dto/permission-response.dto.js';

@Injectable()
export class PermissionsControllerService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PermissionResponseDto[]> {
    const permissions = await this.prisma.client.permission.findMany({
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
    });
    return permissions.map((permission) => PermissionResponseDto.from(permission));
  }
}
