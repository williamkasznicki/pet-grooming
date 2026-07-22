import { Injectable } from '@nestjs/common';
import { MasterDataResponseDto } from './dto/master-data-response.dto.js';
import { MasterDataRepository } from './master-data.repository.js';

@Injectable()
export class MasterDataService {
  constructor(private readonly masterDataRepository: MasterDataRepository) {}

  async listPetSizes(): Promise<MasterDataResponseDto[]> {
    const sizes = await this.masterDataRepository.findActivePetSizes();
    return sizes.map((size) => MasterDataResponseDto.from(size));
  }

  async listBookingStatuses(): Promise<MasterDataResponseDto[]> {
    const statuses = await this.masterDataRepository.findActiveBookingStatuses();
    return statuses.map((status) => MasterDataResponseDto.from(status));
  }

  async listPaymentStatuses(): Promise<MasterDataResponseDto[]> {
    const statuses = await this.masterDataRepository.findActivePaymentStatuses();
    return statuses.map((status) => MasterDataResponseDto.from(status));
  }

}
