import { beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { assertDisposableUrl } from '../src/db/safeguards';

// Explicit PrismaClient instantiation with silenced query logging
export const setupPrisma = new PrismaClient({
  log: [],
});

beforeAll(async () => {
  if (process.env.TEST_DATABASE_URL) {
    assertDisposableUrl(process.env.TEST_DATABASE_URL);
  }
});
