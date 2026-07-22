import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ maxLength: 120, example: 'William Chen' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ maxLength: 40, example: '+66812345678' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}
