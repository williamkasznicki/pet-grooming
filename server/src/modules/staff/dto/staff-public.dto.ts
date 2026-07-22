import { ApiProperty } from '@nestjs/swagger';

export type StaffPublicSource = {
  id: string;
  displayName: string | null;
  user: { name: string };
};

export class StaffPublicDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  displayName!: string;

  static from(staff: StaffPublicSource): StaffPublicDto {
    return {
      id: staff.id,
      displayName: staff.displayName ?? staff.user.name,
    };
  }
}
