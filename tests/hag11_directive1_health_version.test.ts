import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { app, SERVER_COMMIT_SHA, SERVER_BUILD_TIMESTAMP } from '../src/server';

describe('HAG-11 Directive 1: Backend Health & Version Reporting', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('GET /api/health reports status, commit SHA, builtAt, timestamp, and uptime', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(typeof data.commit).toBe('string');
    expect(data.commit.length).toBeGreaterThan(0);
    expect(typeof data.builtAt).toBe('string');
    expect(new Date(data.builtAt).toString()).not.toBe('Invalid Date');
    expect(typeof data.timestamp).toBe('string');
    expect(new Date(data.timestamp).toString()).not.toBe('Invalid Date');
    expect(typeof data.uptime).toBe('number');
  });

  it('GET /health route also serves the enhanced health and version payload', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.commit).toBe(SERVER_COMMIT_SHA);
    expect(data.builtAt).toBe(SERVER_BUILD_TIMESTAMP);
  });

  it('serves CORS headers to GitHub Pages preview origin when configured in CORS_ALLOWED_ORIGINS', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalCors = process.env.CORS_ALLOWED_ORIGINS;

    try {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOWED_ORIGINS = 'https://jdubciii.github.io';

      const res = await fetch(`${baseUrl}/api/health`, {
        headers: {
          Origin: 'https://jdubciii.github.io',
        },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('access-control-allow-origin')).toBe('https://jdubciii.github.io');
      expect(res.headers.get('access-control-allow-credentials')).toBe('true');
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.CORS_ALLOWED_ORIGINS = originalCors;
    }
  });
});
