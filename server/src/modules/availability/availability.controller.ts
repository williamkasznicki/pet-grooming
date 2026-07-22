import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/auth.decorators.js';
import { AvailabilityService } from './availability.service.js';
import { AvailabilityQueryDto } from './dto/availability-query.dto.js';
import { AvailabilityResponseDto } from './dto/availability-response.dto.js';

@ApiTags('availability')
@Public() // clients browse open slots before logging in; booking itself requires auth
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  @ApiOkResponse({ type: AvailabilityResponseDto })
  getAvailability(@Query() query: AvailabilityQueryDto): Promise<AvailabilityResponseDto> {
    return this.availabilityService.getAvailability(query);
  }
}
