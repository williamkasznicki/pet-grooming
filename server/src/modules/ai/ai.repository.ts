import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Persists booking-assistant chat sessions (proof/audit of what the AI said). */
@Injectable()
export class AiRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Reuse the caller's session if it belongs to them, else start a new one. */
  async resolveSession(userId: string, sessionId: string | undefined): Promise<string> {
    if (sessionId) {
      const existing = await this.prisma.client.chatSession.findFirst({
        where: { id: sessionId, userId },
        select: { id: true },
      });
      if (existing) return existing.id;
    }
    const created = await this.prisma.client.chatSession.create({ data: { userId }, select: { id: true } });
    return created.id;
  }

  async appendMessages(sessionId: string, messages: { role: string; content: string }[]): Promise<void> {
    await this.prisma.client.chatMessage.createMany({
      data: messages.map((message) => ({ sessionId, role: message.role, content: message.content })),
    });
    await this.prisma.client.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
  }
}
