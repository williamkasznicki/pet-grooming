import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/auth.decorators.js';
import { EmailLogResponseDto } from './dto/email-log-response.dto.js';
import { MailRepository } from './mail.repository.js';

/** Admin-only email audit log (settings:manage). */
@ApiTags('mail')
@ApiBearerAuth()
@Controller('email-logs')
export class MailController {
  constructor(private readonly mailRepository: MailRepository) {}

  @Get()
  @RequirePermissions('settings:manage')
  @ApiOkResponse({ type: [EmailLogResponseDto] })
  async findRecent(): Promise<EmailLogResponseDto[]> {
    const rows = await this.mailRepository.findRecent(200);
    return rows.map((row) => EmailLogResponseDto.from(row));
  }
}
