import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public, RequirePermissions } from '../../common/decorators/auth.decorators.js';
import { CreatePetSizeDto, UpdatePetSizeDto } from './dto/pet-size.dto.js';
import { MasterDataResponseDto } from './dto/master-data-response.dto.js';
import { MasterDataService } from './master-data.service.js';

@ApiTags('master-data')
@Controller('master-data')
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  // ── Public read-only lookups (booking UI, pre-login) ────────────────

  @Public()
  @Get('pet-sizes')
  @ApiOkResponse({ type: [MasterDataResponseDto] })
  listPetSizes(): Promise<MasterDataResponseDto[]> {
    return this.masterDataService.listPetSizes();
  }

  @Public()
  @Get('booking-statuses')
  @ApiOkResponse({ type: [MasterDataResponseDto] })
  listBookingStatuses(): Promise<MasterDataResponseDto[]> {
    return this.masterDataService.listBookingStatuses();
  }

  @Public()
  @Get('payment-statuses')
  @ApiOkResponse({ type: [MasterDataResponseDto] })
  listPaymentStatuses(): Promise<MasterDataResponseDto[]> {
    return this.masterDataService.listPaymentStatuses();
  }

  // ── Weight-band administration (bands drive pricing → service:manage) ─

  @Get('pet-sizes/all')
  @RequirePermissions('service:manage')
  @ApiBearerAuth()
  @ApiOkResponse({ type: [MasterDataResponseDto], description: 'Includes inactive bands' })
  listAllPetSizes(): Promise<MasterDataResponseDto[]> {
    return this.masterDataService.listAllPetSizes();
  }

  @Post('pet-sizes')
  @RequirePermissions('service:manage')
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: MasterDataResponseDto })
  createPetSize(@Body() dto: CreatePetSizeDto): Promise<MasterDataResponseDto> {
    return this.masterDataService.createPetSize(dto);
  }

  @Put('pet-sizes/:id')
  @RequirePermissions('service:manage')
  @ApiBearerAuth()
  @ApiOkResponse({ type: MasterDataResponseDto })
  updatePetSize(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePetSizeDto): Promise<MasterDataResponseDto> {
    return this.masterDataService.updatePetSize(id, dto);
  }

  @Delete('pet-sizes/:id')
  @RequirePermissions('service:manage')
  @ApiBearerAuth()
  @ApiOkResponse({ type: MasterDataResponseDto, description: '409 when referenced — deactivate instead' })
  deletePetSize(@Param('id', ParseIntPipe) id: number): Promise<MasterDataResponseDto> {
    return this.masterDataService.deletePetSize(id);
  }
}
