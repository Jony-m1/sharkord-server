import { describe, expect, test } from 'bun:test';
import { enterVideoFullscreen } from '../use-fullscreen';

type TListener = () => Promise<void>;

// an iphone's video, the only element it can show full screen, in its own native player
const createVideo = ({ playFails = false } = {}) => {
  const listeners: Record<string, TListener> = {};
  const video = {
    plays: 0,
    entered: false,
    listenerOptions: undefined as AddEventListenerOptions | undefined,
    webkitEnterFullscreen() {
      video.entered = true;
    },
    play() {
      video.plays += 1;

      if (playFails) {
        return Promise.reject(new Error('not allowed'));
      }

      return Promise.resolve();
    },
    addEventListener(
      type: string,
      listener: TListener,
      options?: AddEventListenerOptions
    ) {
      listeners[type] = listener;
      video.listenerOptions = options;
    },
    // what the player's done button ends in
    async closePlayer() {
      const listener = listeners.webkitendfullscreen;

      if (listener) {
        await listener();
      }
    }
  };

  return video;
};

const containerWith = (video: object | null) =>
  ({ querySelector: () => video }) as unknown as HTMLElement;

describe('enterVideoFullscreen', () => {
  test('should open the native player of the video in the tile', () => {
    const video = createVideo();

    expect(enterVideoFullscreen(containerWith(video))).toBe(true);
    expect(video.entered).toBe(true);
  });

  // done pauses the video, and the tile has no controls to play it again
  test('should play the video again once the player closes', async () => {
    const video = createVideo();

    enterVideoFullscreen(containerWith(video));

    expect(video.plays).toBe(0);

    await video.closePlayer();

    expect(video.plays).toBe(1);
    expect(video.listenerOptions?.once).toBe(true);
  });

  test('should leave the frame as it is when the video refuses to play', async () => {
    const video = createVideo({ playFails: true });

    enterVideoFullscreen(containerWith(video));

    await video.closePlayer();

    expect(video.plays).toBe(1);
  });

  test('should report a tile with no video to show full screen', () => {
    expect(enterVideoFullscreen(containerWith(null))).toBe(false);
  });

  // everything but an iphone, where the caller falls back to its own message
  test('should report a video with no native player', () => {
    expect(enterVideoFullscreen(containerWith({}))).toBe(false);
  });
});
