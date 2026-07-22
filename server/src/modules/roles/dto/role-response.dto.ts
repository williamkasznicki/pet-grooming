import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '../../../generated/prisma/client.js';

export type RoleWithPermissions = Prisma.RoleGetPayload<{
  include: { rolePermissions: { include: { permission: true } } };
}>;

export class RoleResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  group!: string | null;

  @ApiProperty({ type: String, nullable: true })
  desc!: string | null;

  @ApiProperty({ type: [String] })
  permissions!: string[];

  static from(role: RoleWithPermissions): RoleResponseDto {
    return {
      id: role.id,
      name: role.name,
      group: role.group,
      desc: role.desc,
      permissions: role.rolePermissions.map((rolePermission) => rolePermission.permission.name),
    };
  }
}
