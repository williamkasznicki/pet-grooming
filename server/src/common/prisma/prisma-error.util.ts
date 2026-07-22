import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ErrorMessages } from '../constants/error-messages.constant.js';
import { Prisma } from '../../generated/prisma/client.js';

export function translatePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new ConflictException(ErrorMessages.UNIQUE_CONFLICT);
    }

    if (error.code === 'P2025') {
      throw new NotFoundException(ErrorMessages.RECORD_NOT_FOUND);
    }

    if (error.code === 'P2003') {
      throw new BadRequestException(ErrorMessages.RELATED_RECORD_MISSING);
    }
  }

  throw error;
}
