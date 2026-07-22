import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class AssignUserRoleDto {
  @ApiProperty({ description: 'Role id', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roleId!: number;
}
