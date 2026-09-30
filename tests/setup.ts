import { beforeAll } from 'vitest';
import { assertDisposableUrl } from '../src/db/safeguards';

beforeAll(() => {
  if (process.env.TEST_DATABASE_URL) {
    assertDisposableUrl(process.env.TEST_DATABASE_URL);
  }
});
