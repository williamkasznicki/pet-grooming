import { Controller, Get } from '@nestjs/common';
import { MasterDataResponseDto } from './dto/master-data-response.dto.js';
import { MasterDataService } from './master-data.service.js';

@Controller('master-data')
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get('pet-sizes')
  listPetSizes(): Promise<MasterDataResponseDto[]> {
    return this.masterDataService.listPetSizes();
  }

  @Get('booking-statuses')
  listBookingStatuses(): Promise<MasterDataResponseDto[]> {
    return this.masterDataService.listBookingStatuses();
  }

  @Get('payment-statuses')
  listPaymentStatuses(): Promise<MasterDataResponseDto[]> {
    return this.masterDataService.listPaymentStatuses();
  }
}
