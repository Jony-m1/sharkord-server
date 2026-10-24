import { describe, expect, test } from 'bun:test';
import { createHash } from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { md5File } from '../md5-file';

describe('md5File', () => {
  test('should hash a file the same as hashing its bytes', async () => {
    const filePath = path.join(os.tmpdir(), `md5-small-${Date.now()}.bin`);
    const content = Buffer.from('the quick brown fox jumps over the lazy dog');

    await fs.writeFile(filePath, content);

    try {
      expect(await md5File(filePath)).toBe(
        createHash('md5').update(content).digest('hex')
      );
    } finally {
      await fs.rm(filePath, { force: true });
    }
  });

  // a timer stands in for the websocket keep-alive: it has to get its turn while a large file
  // is hashed, not only once the hash is done
  test('should let the server answer others while it hashes a large file', async () => {
    const filePath = path.join(os.tmpdir(), `md5-large-${Date.now()}.bin`);

    await fs.writeFile(filePath, Buffer.alloc(256 * 1024 * 1024, 7));

    try {
      let ticks = 0;
      const timer = setInterval(() => {
        ticks++;
      }, 1);

      const hashing = md5File(filePath);
      const hashed = await hashing;

      clearInterval(timer);

      expect(hashed).toHaveLength(32);
      expect(ticks).toBeGreaterThan(3);
    } finally {
      await fs.rm(filePath, { force: true });
    }
  });
});
