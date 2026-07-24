import { ApiProperty } from '@nestjs/swagger';
import { EmailLog } from '../../../generated/prisma/client.js';

export class EmailLogResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() to!: string;
  @ApiProperty() subject!: string;
  @ApiProperty() template!: string;
  @ApiProperty({ enum: ['sent', 'failed', 'skipped'] }) status!: string;
  @ApiProperty({ type: String, nullable: true }) error!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;

  static from(row: EmailLog): EmailLogResponseDto {
    return {
      id: row.id,
      to: row.to,
      subject: row.subject,
      template: row.template,
      status: row.status,
      error: row.error,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
