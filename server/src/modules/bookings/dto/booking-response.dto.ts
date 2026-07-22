import { ApiProperty } from '@nestjs/swagger';
import { BookingWithRelations } from '../bookings.repository.js';

export class BookingStatusRefDto {
  @ApiProperty()
  code!: string;

  @ApiProperty({ type: String, nullable: true })
  hexBgColorCode!: string | null;

  @ApiProperty({ type: String, nullable: true })
  hexTextColorCode!: string | null;
}

export class BookingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clientId!: string;

  @ApiProperty()
  clientName!: string;

  @ApiProperty()
  petId!: string;

  @ApiProperty()
  petName!: string;

  @ApiProperty()
  serviceId!: string;

  @ApiProperty()
  serviceName!: string;

  @ApiProperty()
  staffId!: string;

  @ApiProperty({ type: String, nullable: true })
  staffName!: string | null;

  @ApiProperty({ format: 'date-time' })
  startsAt!: string;

  @ApiProperty({ format: 'date-time' })
  endsAt!: string;

  @ApiProperty({ example: '450.00' })
  priceThb!: string;

  @ApiProperty()
  durationMin!: number;

  @ApiProperty({ description: 'True when staff overrode price/duration' })
  overridden!: boolean;

  @ApiProperty({ type: BookingStatusRefDto })
  status!: BookingStatusRefDto;

  @ApiProperty({ example: 'UNPAID' })
  paymentStatus!: string;

  @ApiProperty({ type: String, nullable: true })
  notes!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  static from(booking: BookingWithRelations): BookingResponseDto {
    return {
      id: booking.id,
      clientId: booking.clientId,
      clientName: booking.client.name,
      petId: booking.petId,
      petName: booking.pet.name,
      serviceId: booking.serviceId,
      serviceName: booking.service.name,
      staffId: booking.staffId,
      staffName: booking.staff.displayName,
      startsAt: booking.startsAt.toISOString(),
      endsAt: booking.endsAt.toISOString(),
      priceThb: booking.priceThb.toString(),
      durationMin: booking.durationMin,
      overridden: booking.overridden,
      status: {
        code: booking.status.code,
        hexBgColorCode: booking.status.hexBgColorCode,
        hexTextColorCode: booking.status.hexTextColorCode,
      },
      paymentStatus: booking.paymentStatus.code,
      notes: booking.notes,
      createdAt: booking.createdAt.toISOString(),
    };
  }
}
