import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Models with a `deletedAt` column. Read queries on these are auto-filtered to
 * `deletedAt: null` — like EF Core global query filters — so nobody can forget.
 * Opt out per-query by mentioning `deletedAt` in `where` yourself
 * (e.g. `{ deletedAt: { not: null } }` to list only deleted rows).
 */
const SOFT_DELETE_MODELS = new Set(['User', 'Pet', 'Service']);

/** Read operations the soft-delete filter applies to (findUnique* excluded: its where must stay a pure unique constraint). */
const FILTERED_OPERATIONS = new Set(['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate', 'groupBy']);

function createBaseClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  });
}

function withSoftDeleteFilter(client: PrismaClient) {
  return client.$extends({
    name: 'soft-delete-filter',
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          if (SOFT_DELETE_MODELS.has(model) && FILTERED_OPERATIONS.has(operation)) {
            const a = args as { where?: Record<string, unknown> };
            if (!a.where || !('deletedAt' in a.where)) {
              a.where = { ...a.where, deletedAt: null };
            }
          }
          return query(args);
        },
      },
    },
  });
}

export type ExtendedPrismaClient = ReturnType<typeof withSoftDeleteFilter>;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly base = createBaseClient();

  /** Use this for all queries — soft-delete filtered. */
  readonly client: ExtendedPrismaClient = withSoftDeleteFilter(this.base);

  async onModuleInit() {
    await this.base.$connect();
  }

  async onModuleDestroy() {
    await this.base.$disconnect();
  }
}
