import { describe, expect, test } from 'bun:test';
import type http from 'http';
import { createHttpServer } from '..';

const closeServer = (server: http.Server) =>
  new Promise<void>((resolve) => server.close(() => resolve()));

describe('createHttpServer host', () => {
  test('should only listen on the given host', async () => {
    const server = await createHttpServer(0, '127.0.0.1');
    const address = server.address();

    await closeServer(server);

    expect(address).not.toBeNull();
    expect(typeof address).not.toBe('string');
    expect((address as { address: string }).address).toBe('127.0.0.1');
  });

  test('should listen on every interface when no host is set', async () => {
    const server = await createHttpServer(0, '');
    const address = server.address();

    await closeServer(server);

    expect(['::', '0.0.0.0']).toContain(
      (address as { address: string }).address
    );
  });
});

// node answers 408 to any request still running after five minutes, and an upload of a few
// gigabytes over a home connection runs far longer than that
describe('createHttpServer timeouts', () => {
  test('should let a request run as long as it takes', async () => {
    const server = await createHttpServer(0, '127.0.0.1');
    const { requestTimeout, headersTimeout } = server;

    await closeServer(server);

    expect(requestTimeout).toBe(0);
    expect(headersTimeout).toBeGreaterThan(0);
  });
});
