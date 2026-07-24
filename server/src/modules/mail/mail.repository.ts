import { Injectable } from '@nestjs/common';
import { EmailLog } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export type EmailLogStatus = 'sent' | 'failed' | 'skipped';

/** Persists email metadata for the admin audit table (never the body/code). */
@Injectable()
export class MailRepository {
  constructor(private readonly prisma: PrismaService) {}

  async logEmail(input: {
    to: string;
    subject: string;
    template: string;
    status: EmailLogStatus;
    error?: string;
  }): Promise<void> {
    await this.prisma.client.emailLog.create({ data: input });
  }

  /** Most recent logs first (admin audit view). */
  findRecent(limit: number): Promise<EmailLog[]> {
    return this.prisma.client.emailLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
  }
}
