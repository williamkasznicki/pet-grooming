import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../../common/auth/auth.decorators.js';
import type { AuthUser } from '../../common/auth/auth.types.js';
import { CreatePetDto } from './dto/create-pet.dto.js';
import { PetResponseDto } from './dto/pet-response.dto.js';
import { UpdatePetDto } from './dto/update-pet.dto.js';
import { PetsService } from './pets.service.js';

@ApiTags('pets')
@ApiBearerAuth()
@Controller('pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Get()
  @RequirePermissions('pet:read')
  @ApiOkResponse({ type: [PetResponseDto], description: 'Own pets; all pets for super admin' })
  findAll(@CurrentUser() user: AuthUser): Promise<PetResponseDto[]> {
    return this.petsService.findAll(user);
  }

  @Get(':id')
  @RequirePermissions('pet:read')
  @ApiOkResponse({ type: PetResponseDto })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<PetResponseDto> {
    return this.petsService.findOne(id, user);
  }

  @Post()
  @RequirePermissions('pet:create')
  @ApiCreatedResponse({ type: PetResponseDto })
  create(@Body() dto: CreatePetDto, @CurrentUser() user: AuthUser): Promise<PetResponseDto> {
    return this.petsService.create(dto, user);
  }

  @Put(':id')
  @RequirePermissions('pet:update')
  @ApiOkResponse({ type: PetResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdatePetDto, @CurrentUser() user: AuthUser): Promise<PetResponseDto> {
    return this.petsService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions('pet:delete')
  @ApiOkResponse({ type: PetResponseDto, description: 'Soft-deleted pet' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<PetResponseDto> {
    return this.petsService.remove(id, user);
  }
}
