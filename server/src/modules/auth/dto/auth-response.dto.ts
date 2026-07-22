import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: [String], example: ['Client'] })
  roles!: string[];

  @ApiProperty({ type: [String], example: ['booking:create', 'booking:read'], description: 'May contain "*"' })
  permissions!: string[];
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token (Bearer)' })
  accessToken!: string;

  @ApiProperty({ description: 'Opaque refresh token — store securely, single use (rotated on refresh)' })
  refreshToken!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}
