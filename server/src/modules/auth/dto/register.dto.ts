import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'owner@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 72, example: 'S3cure-pass' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ maxLength: 120, example: 'Somchai P.' })
  @IsString()
  @MaxLength(120)
  name!: string;

  // Required: staff phone the shop to confirm bookings.
  @ApiProperty({ example: '0812345678', description: 'Contact phone (required — used to confirm bookings)' })
  @IsString()
  @Matches(/^\+?[0-9\s-]{6,20}$/, { message: 'phone must be a valid phone number' })
  phone!: string;
}
