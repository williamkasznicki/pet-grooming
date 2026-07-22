import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';

export function translatePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new ConflictException('A record with this unique value already exists.');
    }

    if (error.code === 'P2025') {
      throw new NotFoundException('Record not found.');
    }

    if (error.code === 'P2003') {
      throw new BadRequestException('Related record does not exist.');
    }
  }

  throw error;
}
