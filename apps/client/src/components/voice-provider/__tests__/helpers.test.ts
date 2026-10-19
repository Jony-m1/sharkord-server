import { StreamKind } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { getAfkDeafenChange, isOwnProducerEvent } from '../helpers';

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
