import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStaffDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiPropertyOptional({ maxLength: 120, example: 'Nok' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @ApiPropertyOptional({ maxLength: 1000, example: 'Senior groomer for small breeds.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;
}
