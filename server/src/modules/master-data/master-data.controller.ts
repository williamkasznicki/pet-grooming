import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { MasterDataResponseDto } from './dto/master-data-response.dto.js';
import { MasterDataService } from './master-data.service.js';

@ApiTags('master-data')
@Controller('master-data')
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get('pet-sizes')
  @ApiOkResponse({ type: [MasterDataResponseDto] })
  listPetSizes(): Promise<MasterDataResponseDto[]> {
    return this.masterDataService.listPetSizes();
  }

  @Get('booking-statuses')
  @ApiOkResponse({ type: [MasterDataResponseDto] })
  listBookingStatuses(): Promise<MasterDataResponseDto[]> {
    return this.masterDataService.listBookingStatuses();
  }

  @Get('payment-statuses')
  @ApiOkResponse({ type: [MasterDataResponseDto] })
  listPaymentStatuses(): Promise<MasterDataResponseDto[]> {
    return this.masterDataService.listPaymentStatuses();
  }
}
