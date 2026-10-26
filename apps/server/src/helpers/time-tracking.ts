import { addUserTime } from '../db/mutations/users';
import { getUserTimeTotals } from '../db/queries/users';

// when each session's time was last added to the user's total; a user counts as online while
// at least one of their devices is connected, so two devices never count twice
const onlineSince = new Map<number, number>();
const voiceSince = new Map<number, number>();

const startOnlineSession = (userId: number) => {
  if (!onlineSince.has(userId)) onlineSince.set(userId, Date.now());
};

const startVoiceSession = (userId: number) => {
  if (!voiceSince.has(userId)) voiceSince.set(userId, Date.now());
};

const endSession = (sessions: Map<number, number>, userId: number) => {
  const since = sessions.get(userId);

  if (since === undefined) return 0;

  sessions.delete(userId);

  return Date.now() - since;
};

const endOnlineSession = (userId: number) => {
  const onlineMs = endSession(onlineSince, userId);

  if (onlineMs > 0) addUserTime([{ userId, onlineMs, voiceMs: 0 }]);
};

const endVoiceSession = (userId: number) => {
  const voiceMs = endSession(voiceSince, userId);

  if (voiceMs > 0) addUserTime([{ userId, onlineMs: 0, voiceMs }]);
};

// saves the running sessions so far, so a restart loses at most the time since the last save
const flushTrackedTime = () => {
  const now = Date.now();
  const totals = new Map<number, { onlineMs: number; voiceMs: number }>();

  onlineSince.forEach((since, userId) => {
    totals.set(userId, { onlineMs: now - since, voiceMs: 0 });
    onlineSince.set(userId, now);
  });

  voiceSince.forEach((since, userId) => {
    const entry = totals.get(userId) ?? { onlineMs: 0, voiceMs: 0 };

    entry.voiceMs = now - since;
    totals.set(userId, entry);
    voiceSince.set(userId, now);
  });

  addUserTime(
    Array.from(totals, ([userId, { onlineMs, voiceMs }]) => ({
      userId,
      onlineMs,
      voiceMs
    }))
  );
};

// undefined when there is no such user, so a caller asking about someone else can tell an
// unknown id apart from a user with no time yet
const getUserTimeStats = async (userId: number) => {
  const totals = await getUserTimeTotals(userId);

  if (!totals) return undefined;

  const now = Date.now();
  const online = onlineSince.get(userId);
  const voice = voiceSince.get(userId);

  return {
    onlineTimeMs: totals.onlineTimeMs + (online ? now - online : 0),
    voiceTimeMs: totals.voiceTimeMs + (voice ? now - voice : 0),
    online: online !== undefined,
    inVoice: voice !== undefined
  };
};

const clearTrackedTimeForTests = () => {
  onlineSince.clear();
  voiceSince.clear();
};

export {
  clearTrackedTimeForTests,
  endOnlineSession,
  endVoiceSession,
  flushTrackedTime,
  getUserTimeStats,
  startOnlineSession,
  startVoiceSession
};
