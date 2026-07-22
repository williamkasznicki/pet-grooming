import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CreatePetDto } from './dto/create-pet.dto.js';
import { PetResponseDto } from './dto/pet-response.dto.js';
import { UpdatePetDto } from './dto/update-pet.dto.js';
import { PetsService } from './pets.service.js';

@Controller('pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Get()
  findAll(): Promise<PetResponseDto[]> {
    return this.petsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<PetResponseDto> {
    return this.petsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePetDto): Promise<PetResponseDto> {
    return this.petsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePetDto): Promise<PetResponseDto> {
    return this.petsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<PetResponseDto> {
    return this.petsService.remove(id);
  }
}
