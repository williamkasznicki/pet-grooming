import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ maxLength: 80, example: 'Manager' })
  @IsString()
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ maxLength: 80, example: 'Staff' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  group?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  desc?: string;
}
