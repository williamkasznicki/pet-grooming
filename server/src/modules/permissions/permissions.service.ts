import { Injectable } from '@nestjs/common';
import { PermissionResponseDto } from './dto/permission-response.dto.js';
import { PermissionsRepository } from './permissions.repository.js';

@Injectable()
export class PermissionsControllerService {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  async findAll(): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionsRepository.findManyOrdered();
    return permissions.map((permission) => PermissionResponseDto.from(permission));
  }
}
