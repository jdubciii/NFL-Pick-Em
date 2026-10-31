import { beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { assertDisposableUrl } from '../src/db/safeguards';
import {
  setExplicitNonTransactionTestAdapter,
  setAllowLegacyUnscopedPicksRouteForTesting,
  executeSerializedPickMutation,
} from '../src/routes/picks';

// Explicit PrismaClient instantiation with silenced query logging
export const setupPrisma = new PrismaClient({
  log: [],
});

// Explicitly inject test adapter and legacy unscoped route permission for testing environment
setExplicitNonTransactionTestAdapter(executeSerializedPickMutation);
setAllowLegacyUnscopedPicksRouteForTesting(true);

beforeAll(async () => {
  if (process.env.TEST_DATABASE_URL) {
    assertDisposableUrl(process.env.TEST_DATABASE_URL);
  }
  setExplicitNonTransactionTestAdapter(executeSerializedPickMutation);
  setAllowLegacyUnscopedPicksRouteForTesting(true);
});


