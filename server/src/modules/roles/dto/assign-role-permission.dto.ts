import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class AssignRolePermissionDto {
  @ApiProperty({ description: 'Permission id', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  permissionId!: number;
}
