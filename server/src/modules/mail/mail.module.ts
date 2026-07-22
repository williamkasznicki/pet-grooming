import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service.js';

/** Global: booking notifications (and future flows) inject MailService directly. */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
