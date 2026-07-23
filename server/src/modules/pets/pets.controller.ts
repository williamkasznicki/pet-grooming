import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators.js';
import type { AuthUser } from '../../common/types/auth.types.js';
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

  @Post(':id/photo')
  @RequirePermissions('pet:update')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { photo: { type: 'string', format: 'binary' } },
      required: ['photo'],
    },
  })
  @ApiOkResponse({ type: PetResponseDto, description: 'Pet with the new photoUrl' })
  uploadPhoto(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    photo: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ): Promise<PetResponseDto> {
    return this.petsService.setPhoto(id, photo, user);
  }

  @Delete(':id')
  @RequirePermissions('pet:delete')
  @ApiOkResponse({ type: PetResponseDto, description: 'Soft-deleted pet' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<PetResponseDto> {
    return this.petsService.remove(id, user);
  }
}
