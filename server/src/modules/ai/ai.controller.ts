import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/auth.decorators.js';
import type { AuthUser } from '../../common/types/auth.types.js';
import { AiService } from './ai.service.js';
import { AiStatusDto, ChatDto, ChatReplyDto } from './dto/chat.dto.js';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('status')
  @ApiOkResponse({ type: AiStatusDto })
  status(): AiStatusDto {
    return { configured: this.aiService.isConfigured };
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ChatReplyDto })
  chat(@Body() dto: ChatDto, @CurrentUser() user: AuthUser): Promise<ChatReplyDto> {
    return this.aiService.chat(user, dto.messages);
  }
}
