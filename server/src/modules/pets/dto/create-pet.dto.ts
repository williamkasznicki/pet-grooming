import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePetDto {
  @IsString()
  @MaxLength(191)
  ownerId!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  breed?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  sizeId!: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthDate?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
