import { render } from '@react-email/components';
import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { MailRepository } from './mail.repository.js';
import { BookingConfirmedTemplate } from './templates/booking-confirmed.template.js';
import { LoginOtpTemplate } from './templates/login-otp.template.js';
import { PasswordResetTemplate } from './templates/password-reset.template.js';

export type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  template: string;
};

/**
 * Thin wrapper around Resend. Templates get their own methods; every send is
 * recorded in the EmailLog table (metadata only — never the body or code).
 *
 * Without RESEND_API_KEY the service no-ops with a warning, so local dev works
 * offline. NEVER log recipient addresses or message bodies (AGENTS.md).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger( MailService.name );
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor ( private readonly mailRepository: MailRepository ) {
    const apiKey = process.env.RESEND_API_KEY;
    this.resend = apiKey ? new Resend( apiKey ) : null;
    // Resend's shared dev sender works out of the box; set MAIL_FROM once a domain is verified.
    this.from = process.env.MAIL_FROM ?? 'Pet Grooming <onboarding@resend.dev>';
  }

  async send ( input: SendMailInput ): Promise<void> {
    if ( !this.resend ) {
      this.logger.warn( 'RESEND_API_KEY not set — email skipped.' );
      await this.audit( input, 'skipped' );
      return;
    }

    // In dev, Resend's test key only delivers to the account owner — redirect
    // all mail there (set MAIL_DEV_REDIRECT to your Resend account email).
    const recipient =
      process.env.NODE_ENV === 'production' ? input.to : ( process.env.MAIL_DEV_REDIRECT ?? input.to );
    const { error } = await this.resend.emails.send( {
      from: this.from,
      to: recipient,
      subject: input.subject,
      html: input.html,
    } );
    if ( error ) {
      // Log the provider error only — never the recipient or body.
      this.logger.error( `Resend send failed: ${ error.name } ${ error.message }` );
      await this.audit( input, 'failed', `${ error.name }: ${ error.message }` );
      throw new Error( 'Email delivery failed' );
    }
    await this.audit( input, 'sent' );
  }

  /** Record the send in EmailLog; never let auditing failures break the flow. */
  private async audit ( input: SendMailInput, status: 'sent' | 'failed' | 'skipped', error?: string ): Promise<void> {
    await this.mailRepository
      .logEmail( { to: input.to, subject: input.subject, template: input.template, status, error } )
      .catch( ( err: unknown ) => this.logger.error( `EmailLog write failed: ${ String( err ) }` ) );
  }

  /** Booking confirmation. Fire-and-forget from the booking flow — never blocks the response. */
  async sendBookingConfirmation ( input: {
    to: string;
    clientName: string;
    petName: string;
    serviceName: string;
    staffName: string;
    startsAtLocal: string;
    priceThb: string;
  } ): Promise<void> {
    // React Email template (templates/) rendered to inline-styled HTML —
    // all templates share the spa-lagoon EmailLayout
    const html = await render(
      BookingConfirmedTemplate( {
        clientName: input.clientName,
        petName: input.petName,
        serviceName: input.serviceName,
        staffName: input.staffName,
        startsAtLocal: input.startsAtLocal,
        priceThb: input.priceThb,
        bookingsUrl: `${ process.env.FRONTEND_URL ?? 'http://localhost:3000' }/bookings`,
      } ),
    );

    await this.send( {
      to: input.to,
      subject: `Booking confirmed — ${ input.serviceName } for ${ input.petName }`,
      html,
      template: 'booking-confirmed',
    } );
  }

  /** Login 2FA code. Never log the code (AGENTS.md: no verification tokens). */
  async sendLoginOtp ( input: { to: string; name: string; code: string; expiresInMinutes: number } ): Promise<void> {
    const html = await render(
      LoginOtpTemplate( { name: input.name, code: input.code, expiresInMinutes: input.expiresInMinutes } ),
    );
    await this.send( { to: input.to, subject: 'Your Pet Grooming login code', html, template: 'login-otp' } );
  }

  /** Password reset code. */
  async sendPasswordReset ( input: { to: string; name: string; code: string; expiresInMinutes: number } ): Promise<void> {
    const html = await render(
      PasswordResetTemplate( { name: input.name, code: input.code, expiresInMinutes: input.expiresInMinutes } ),
    );
    await this.send( { to: input.to, subject: 'Reset your Pet Grooming password', html, template: 'password-reset' } );
  }
}
