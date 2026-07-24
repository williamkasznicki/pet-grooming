import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @ApiProperty({ example: 'How much is a full groom for a poodle?' })
  @IsString()
  @MaxLength(2000)
  content!: string;
}

export class ChatDto {
  @ApiProperty({ type: [ChatMessageDto], description: 'Running conversation, oldest first' })
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];

  @ApiPropertyOptional({ description: 'Existing chat session id to keep threading' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sessionId?: string;
}

export class ChatReplyDto {
  @ApiProperty()
  reply!: string;

  @ApiProperty({ description: 'Session id — send it back on the next turn' })
  sessionId!: string;
}

export class AiStatusDto {
  @ApiProperty({ description: 'Whether the assistant is configured (OPENROUTER_API_KEY set)' })
  configured!: boolean;
}
