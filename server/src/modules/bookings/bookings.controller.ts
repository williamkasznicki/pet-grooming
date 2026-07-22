import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators.js';
import type { AuthUser } from '../../common/types/auth.types.js';
import { BookingsService } from './bookings.service.js';
import { BookingResponseDto } from './dto/booking-response.dto.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { OverrideBookingDto } from './dto/override-booking.dto.js';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto.js';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @RequirePermissions('booking:create')
  @ApiCreatedResponse({ type: BookingResponseDto, description: 'Instant-confirmed booking' })
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: AuthUser): Promise<BookingResponseDto> {
    return this.bookingsService.create(dto, user);
  }

  @Get()
  @RequirePermissions('booking:read')
  @ApiOkResponse({ type: [BookingResponseDto], description: 'Own bookings; assigned bookings for staff; all for super admin' })
  findAll(@CurrentUser() user: AuthUser): Promise<BookingResponseDto[]> {
    return this.bookingsService.findAll(user);
  }

  @Get(':id')
  @RequirePermissions('booking:read')
  @ApiOkResponse({ type: BookingResponseDto })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<BookingResponseDto> {
    return this.bookingsService.findOne(id, user);
  }

  @Patch(':id/status')
  @RequirePermissions('booking:update')
  @ApiOkResponse({ type: BookingResponseDto })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
    @CurrentUser() user: AuthUser,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.updateStatus(id, dto, user);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('booking:cancel')
  @ApiOkResponse({ type: BookingResponseDto, description: 'Client cancel — subject to the cutoff setting' })
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<BookingResponseDto> {
    return this.bookingsService.cancelOwn(id, user);
  }

  @Patch(':id/payment')
  @RequirePermissions('booking:update')
  @ApiOkResponse({ type: BookingResponseDto, description: 'Mark paid (at shop)' })
  markPaid(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<BookingResponseDto> {
    return this.bookingsService.markPaid(id, user);
  }

  @Patch(':id/override')
  @RequirePermissions('booking:override')
  @ApiOkResponse({ type: BookingResponseDto, description: 'Staff price/duration override' })
  override(
    @Param('id') id: string,
    @Body() dto: OverrideBookingDto,
    @CurrentUser() user: AuthUser,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.override(id, dto, user);
  }
}
