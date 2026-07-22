import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

export type SendMailInput = {
  to: string;
  subject: string;
  html: string;
};

/**
 * Thin wrapper around Resend. Booking confirmation/reminder emails (build-order
 * step 5) go through here — templates get their own methods on this service.
 *
 * Without RESEND_API_KEY the service no-ops with a warning, so local dev works
 * offline. NEVER log recipient addresses or message bodies (AGENTS.md).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.resend = apiKey ? new Resend(apiKey) : null;
    // Resend's shared dev sender works out of the box; set MAIL_FROM once a domain is verified.
    this.from = process.env.MAIL_FROM ?? 'Pet Grooming <onboarding@resend.dev>';
  }

  async send(input: SendMailInput): Promise<void> {
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY not set — email skipped.');
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    if (error) {
      // Log the provider error only — never the recipient or body.
      this.logger.error(`Resend send failed: ${error.name} ${error.message}`);
      throw new Error('Email delivery failed');
    }
  }
}
