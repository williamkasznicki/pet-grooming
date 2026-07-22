import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreatePetDto } from './dto/create-pet.dto.js';
import { PetResponseDto } from './dto/pet-response.dto.js';
import { UpdatePetDto } from './dto/update-pet.dto.js';
import { PetsService } from './pets.service.js';

@ApiTags('pets')
@Controller('pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Get()
  @ApiOkResponse({ type: [PetResponseDto] })
  findAll(): Promise<PetResponseDto[]> {
    return this.petsService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: PetResponseDto })
  findOne(@Param('id') id: string): Promise<PetResponseDto> {
    return this.petsService.findOne(id);
  }

  @Post()
  @ApiCreatedResponse({ type: PetResponseDto })
  create(@Body() dto: CreatePetDto): Promise<PetResponseDto> {
    return this.petsService.create(dto);
  }

  @Put(':id')
  @ApiOkResponse({ type: PetResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdatePetDto): Promise<PetResponseDto> {
    return this.petsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ type: PetResponseDto, description: 'Soft-deleted pet' })
  remove(@Param('id') id: string): Promise<PetResponseDto> {
    return this.petsService.remove(id);
  }
}
