import { describe, expect, spyOn, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { tdb } from '../../__tests__/setup';
import { users } from '../../db/schema';
import {
  endOnlineSession,
  endVoiceSession,
  flushTrackedTime,
  getUserTimeStats,
  startOnlineSession,
  startVoiceSession
} from '../time-tracking';

const SAVED_ONLINE_MS = 2 * 60 * 60 * 1000;
const SAVED_VOICE_MS = 30 * 60 * 1000;

const savedTotals = (userId: number) =>
  tdb
    .select({ online: users.onlineTimeMs, voice: users.voiceTimeMs })
    .from(users)
    .where(eq(users.id, userId))
    .get();

// moves the clock to a fixed point, so the times added are exact
const clockAt = (ms: number) => spyOn(Date, 'now').mockReturnValue(ms);

describe('time tracking', () => {
  test('should add an online session to the total when it ends', async () => {
    clockAt(1_000_000);
    startOnlineSession(1);

    clockAt(1_090_000);
    endOnlineSession(1);

    expect(await savedTotals(1)).toEqual({
      online: SAVED_ONLINE_MS + 90_000,
      voice: SAVED_VOICE_MS
    });
  });

  test('should add a call to the total when it ends', async () => {
    clockAt(1_000_000);
    startVoiceSession(2);

    clockAt(1_045_000);
    endVoiceSession(2);

    expect(await savedTotals(2)).toEqual({ online: 0, voice: 45_000 });
  });

  test('should count a user online once however many devices join', async () => {
    clockAt(1_000_000);
    startOnlineSession(2);

    clockAt(1_030_000);
    startOnlineSession(2);

    clockAt(1_060_000);
    endOnlineSession(2);

    expect((await savedTotals(2))?.online).toBe(60_000);
  });

  test('should save nothing for a session that never started', async () => {
    endOnlineSession(2);
    endVoiceSession(2);

    expect(await savedTotals(2)).toEqual({ online: 0, voice: 0 });
  });

  test('should save running sessions on a flush and keep them running', async () => {
    clockAt(1_000_000);
    startOnlineSession(2);
    startVoiceSession(2);

    clockAt(1_060_000);
    flushTrackedTime();

    expect(await savedTotals(2)).toEqual({ online: 60_000, voice: 60_000 });

    clockAt(1_090_000);
    endOnlineSession(2);
    endVoiceSession(2);

    // the flushed minute is not added a second time
    expect(await savedTotals(2)).toEqual({ online: 90_000, voice: 90_000 });
  });

  test('should report the saved totals plus the running sessions', async () => {
    clockAt(1_000_000);
    startOnlineSession(1);
    startVoiceSession(1);

    clockAt(1_020_000);

    expect(await getUserTimeStats(1)).toEqual({
      onlineTimeMs: SAVED_ONLINE_MS + 20_000,
      voiceTimeMs: SAVED_VOICE_MS + 20_000,
      online: true,
      inVoice: true
    });
  });

  test('should report only the saved totals while offline', async () => {
    expect(await getUserTimeStats(1)).toEqual({
      onlineTimeMs: SAVED_ONLINE_MS,
      voiceTimeMs: SAVED_VOICE_MS,
      online: false,
      inVoice: false
    });
  });
});
