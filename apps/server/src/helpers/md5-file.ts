import { createHash } from 'crypto';

// the server runs on one thread, so hashing a file of a few gigabytes in one go stops it
// answering anyone for seconds; the websocket keep-alive gives up after five and drops every
// connection, which takes everyone out of voice. handing the loop back between slices costs
// next to nothing and keeps the pings answered
const YIELD_EVERY_BYTES = 32 * 1024 * 1024;

const yieldToEventLoop = () =>
  new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

const md5File = async (path: string): Promise<string> => {
  const hash = createHash('md5');
  const stream = Bun.file(
    path
  ).stream() as unknown as AsyncIterable<Uint8Array>;
  let sinceYield = 0;

  for await (const chunk of stream) {
    hash.update(chunk);
    sinceYield += chunk.byteLength;

    if (sinceYield >= YIELD_EVERY_BYTES) {
      sinceYield = 0;
      await yieldToEventLoop();
    }
  }

  return hash.digest('hex');
};

export { md5File };
