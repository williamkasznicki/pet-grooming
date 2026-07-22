import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
