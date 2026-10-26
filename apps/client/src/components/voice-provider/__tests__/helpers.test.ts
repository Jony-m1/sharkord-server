import { StreamKind } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import {
  allSettledOrThrow,
  getAfkDeafenChange,
  isOwnProducerEvent,
  isScreenPickerCancel
} from '../helpers';

describe('isOwnProducerEvent', () => {
  test('should treat a producer with our own user id as ours', () => {
    expect(isOwnProducerEvent(1, 1, StreamKind.AUDIO)).toBe(true);
    expect(isOwnProducerEvent(1, 1, StreamKind.VIDEO)).toBe(true);
    expect(isOwnProducerEvent(1, 1, StreamKind.SCREEN)).toBe(true);
    expect(isOwnProducerEvent(1, 1, StreamKind.SCREEN_AUDIO)).toBe(true);
  });

  test('should treat another user as not ours', () => {
    expect(isOwnProducerEvent(2, 1, StreamKind.AUDIO)).toBe(false);
  });

  // the runtime hands out external stream ids from a counter starting at zero, so the
  // second stream in a channel is id 1, which is also the first user id. treating that as
  // our own producer drops the plugin's audio for exactly one unlucky listener
  test('should never treat an external stream as ours, even on an id collision', () => {
    expect(isOwnProducerEvent(1, 1, StreamKind.EXTERNAL_AUDIO)).toBe(false);
    expect(isOwnProducerEvent(1, 1, StreamKind.EXTERNAL_VIDEO)).toBe(false);
    expect(isOwnProducerEvent(0, 0, StreamKind.EXTERNAL_AUDIO)).toBe(false);
  });

  test('should treat nothing as ours before the own user id is known', () => {
    expect(isOwnProducerEvent(1, undefined, StreamKind.AUDIO)).toBe(false);
  });
});

describe('getAfkDeafenChange', () => {
  test('should deafen when going away', () => {
    expect(
      getAfkDeafenChange({
        wasAfk: false,
        isAfk: true,
        soundMuted: false,
        deafenedByAfk: false
      })
    ).toBe('deafen');
  });

  test('should undeafen when coming back after going away deafened you', () => {
    expect(
      getAfkDeafenChange({
        wasAfk: true,
        isAfk: false,
        soundMuted: true,
        deafenedByAfk: true
      })
    ).toBe('undeafen');
  });

  test('should leave someone who was already deafened deafened on both ends', () => {
    expect(
      getAfkDeafenChange({
        wasAfk: false,
        isAfk: true,
        soundMuted: true,
        deafenedByAfk: false
      })
    ).toBeUndefined();
    expect(
      getAfkDeafenChange({
        wasAfk: true,
        isAfk: false,
        soundMuted: true,
        deafenedByAfk: false
      })
    ).toBeUndefined();
  });

  test('should do nothing on coming back when you undeafened yourself while away', () => {
    expect(
      getAfkDeafenChange({
        wasAfk: true,
        isAfk: false,
        soundMuted: false,
        deafenedByAfk: false
      })
    ).toBeUndefined();
  });

  test('should do nothing while the AFK status stays the same', () => {
    expect(
      getAfkDeafenChange({
        wasAfk: true,
        isAfk: true,
        soundMuted: false,
        deafenedByAfk: false
      })
    ).toBeUndefined();
    expect(
      getAfkDeafenChange({
        wasAfk: false,
        isAfk: false,
        soundMuted: true,
        deafenedByAfk: true
      })
    ).toBeUndefined();
  });
});

describe('isScreenPickerCancel', () => {
  test('should treat a browser picker closed without a choice as a cancel', () => {
    expect(
      isScreenPickerCancel(
        new DOMException('Permission denied', 'NotAllowedError')
      )
    ).toBe(true);
  });

  test('should treat the desktop picker closed without a choice as a cancel', () => {
    expect(
      isScreenPickerCancel(
        new DOMException('Error starting capture', 'AbortError')
      )
    ).toBe(true);
  });

  test('should still report real failures', () => {
    expect(
      isScreenPickerCancel(
        new DOMException('Could not start video source', 'NotReadableError')
      )
    ).toBe(false);
    expect(isScreenPickerCancel(new Error('No video track'))).toBe(false);
    expect(isScreenPickerCancel(undefined)).toBe(false);
  });
});

// init calls this from inside the voice provider, with mediasoup transports and media
// devices that the client's bun tests have no browser to create.
// the ordering they rely on is covered here, the flows themselves by the voice e2e specs
describe('allSettledOrThrow', () => {
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  const deferred = () => {
    let resolve: () => void = () => {};
    let reject: (reason: Error) => void = () => {};
    const promise = new Promise<void>((onResolve, onReject) => {
      resolve = onResolve;
      reject = onReject;
    });

    return { promise, resolve, reject };
  };

  test('should resolve only once every step has resolved', async () => {
    const producerTransport = deferred();
    const consumerTransport = deferred();
    let done = false;

    const all = allSettledOrThrow([
      producerTransport.promise,
      consumerTransport.promise
    ]);
    const finished = all.then(() => {
      done = true;
    });

    producerTransport.resolve();
    await flush();

    expect(done).toBe(false);

    consumerTransport.resolve();
    await finished;

    expect(done).toBe(true);
  });

  test('should fail only once a slower step has settled, so the cleanup after it misses nothing', async () => {
    const mic = deferred();
    let micSettled = false;
    let micSettledWhenFailed: boolean | undefined;

    const micStep = mic.promise.then(() => {
      micSettled = true;
    });
    const all = allSettledOrThrow([
      Promise.reject(new Error('getProducers failed')),
      micStep
    ]);
    const failure = all.catch((error: Error) => {
      micSettledWhenFailed = micSettled;

      return error.message;
    });

    await flush();

    expect(micSettledWhenFailed).toBeUndefined();

    mic.resolve();

    expect(await failure).toBe('getProducers failed');
    expect(micSettledWhenFailed).toBe(true);
  });

  test('should rethrow the first failure in the order the steps were given', async () => {
    const producerTransport = deferred();
    const consumerTransport = deferred();

    const all = allSettledOrThrow([
      producerTransport.promise,
      consumerTransport.promise
    ]);

    consumerTransport.reject(new Error('consumer transport failed'));
    producerTransport.reject(new Error('producer transport failed'));

    await expect(all).rejects.toThrow('producer transport failed');
  });

  test('should resolve when there are no steps', async () => {
    await expect(allSettledOrThrow([])).resolves.toBeUndefined();
  });
});
