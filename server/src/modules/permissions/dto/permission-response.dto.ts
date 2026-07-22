import { ApiProperty } from '@nestjs/swagger';
import { Permission } from '../../../generated/prisma/client.js';

export class PermissionResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ type: String, nullable: true })
  group!: string | null;

  @ApiProperty({ type: String, nullable: true })
  desc!: string | null;

  static from(permission: Permission): PermissionResponseDto {
    return {
      id: permission.id,
      name: permission.name,
      displayName: permission.displayName,
      group: permission.group,
      desc: permission.desc,
    };
  }
}
