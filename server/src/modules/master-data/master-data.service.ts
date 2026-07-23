import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ErrorMessages } from '../../common/constants/error-messages.constant.js';
import { translatePrismaError } from '../../common/utils/prisma-error.util.js';
import { Prisma } from '../../generated/prisma/client.js';
import { CreatePetSizeDto, UpdatePetSizeDto } from './dto/pet-size.dto.js';
import { MasterDataResponseDto } from './dto/master-data-response.dto.js';
import { MasterDataRepository } from './master-data.repository.js';

@Injectable()
export class MasterDataService {
  constructor(private readonly masterDataRepository: MasterDataRepository) {}

  async listPetSizes(): Promise<MasterDataResponseDto[]> {
    const sizes = await this.masterDataRepository.findActivePetSizes();
    return sizes.map((size) => MasterDataResponseDto.from(size));
  }

  /** Admin view includes inactive bands so they can be re-enabled. */
  async listAllPetSizes(): Promise<MasterDataResponseDto[]> {
    const sizes = await this.masterDataRepository.findAllPetSizes();
    return sizes.map((size) => MasterDataResponseDto.from(size));
  }

  async createPetSize(dto: CreatePetSizeDto): Promise<MasterDataResponseDto> {
    this.validateRange(dto.minWeightKg, dto.maxWeightKg);

    try {
      const size = await this.masterDataRepository.createPetSize({
        code: dto.code,
        minWeightKg: dto.minWeightKg,
        maxWeightKg: dto.maxWeightKg ?? null,
        hexBgColorCode: dto.hexBgColorCode,
        hexTextColorCode: dto.hexTextColorCode,
        desc: dto.desc,
        isActive: dto.isActive ?? true,
      });
      return MasterDataResponseDto.from(size);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async updatePetSize(id: number, dto: UpdatePetSizeDto): Promise<MasterDataResponseDto> {
    await this.ensureExists(id);
    if (dto.minWeightKg !== undefined && dto.maxWeightKg !== undefined) {
      this.validateRange(dto.minWeightKg, dto.maxWeightKg);
    }

    try {
      const size = await this.masterDataRepository.updatePetSize(id, {
        code: dto.code,
        minWeightKg: dto.minWeightKg,
        // Explicit null clears the upper bound (open-ended band)
        maxWeightKg: dto.maxWeightKg,
        hexBgColorCode: dto.hexBgColorCode,
        hexTextColorCode: dto.hexTextColorCode,
        desc: dto.desc,
        isActive: dto.isActive,
      });
      return MasterDataResponseDto.from(size);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async deletePetSize(id: number): Promise<MasterDataResponseDto> {
    await this.ensureExists(id);

    try {
      const size = await this.masterDataRepository.deletePetSize(id);
      return MasterDataResponseDto.from(size);
    } catch (error) {
      // Referenced by pets/tiers → FK violation; guide the admin to deactivate instead.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(ErrorMessages.SIZE_BAND_IN_USE);
      }
      translatePrismaError(error);
    }
  }

  async listBookingStatuses(): Promise<MasterDataResponseDto[]> {
    const statuses = await this.masterDataRepository.findActiveBookingStatuses();
    return statuses.map((status) => MasterDataResponseDto.from(status));
  }

  async listPaymentStatuses(): Promise<MasterDataResponseDto[]> {
    const statuses = await this.masterDataRepository.findActivePaymentStatuses();
    return statuses.map((status) => MasterDataResponseDto.from(status));
  }

  private async ensureExists(id: number): Promise<void> {
    if (!(await this.masterDataRepository.petSizeExists(id))) {
      throw new NotFoundException(ErrorMessages.SIZE_BAND_NOT_FOUND);
    }
  }

  private validateRange(minWeightKg: number, maxWeightKg: number | undefined): void {
    if (maxWeightKg !== undefined && minWeightKg >= maxWeightKg) {
      throw new BadRequestException(ErrorMessages.SIZE_BAND_RANGE_INVALID);
    }
  }
}
