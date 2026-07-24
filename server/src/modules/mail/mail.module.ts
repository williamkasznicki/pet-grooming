import { Global, Module } from '@nestjs/common';
import { MailController } from './mail.controller.js';
import { MailRepository } from './mail.repository.js';
import { MailService } from './mail.service.js';

/** Global: booking notifications (and future flows) inject MailService directly. */
@Global()
@Module({
  controllers: [MailController],
  providers: [MailService, MailRepository],
  exports: [MailService],
})
export class MailModule {}
