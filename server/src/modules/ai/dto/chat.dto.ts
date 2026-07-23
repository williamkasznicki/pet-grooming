import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsString, MaxLength, ValidateNested } from 'class-validator';

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
}

export class ChatReplyDto {
  @ApiProperty()
  reply!: string;
}

export class AiStatusDto {
  @ApiProperty({ description: 'Whether the assistant is configured (OPENROUTER_API_KEY set)' })
  configured!: boolean;
}
