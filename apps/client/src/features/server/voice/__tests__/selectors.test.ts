import type { IRootState } from '@/features/store';
import type { TVoiceMap, TVoiceUserState } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import {
  voiceChannelIdByUserIdSelector,
  voiceUserStateSelector
} from '../selectors';

const LOUNGE_ID = 10;
const CONFERENCE_ID = 11;

const voiceState: TVoiceUserState = {
  micMuted: false,
  soundMuted: false,
  webcamEnabled: false,
  sharingScreen: false,
  serverMuted: false
};

const stateWith = ({ voiceMap = {} }: { voiceMap?: TVoiceMap }) =>
  ({ server: { voiceMap } }) as unknown as IRootState;

describe('voiceChannelIdByUserIdSelector', () => {
  test('should find the call a user is in', () => {
    const state = stateWith({
      voiceMap: {
        [LOUNGE_ID]: { users: { 1: voiceState } },
        [CONFERENCE_ID]: { users: { 2: voiceState } }
      }
    });

    expect(voiceChannelIdByUserIdSelector(state, 2)).toBe(CONFERENCE_ID);
  });

  test('should be undefined for a user in no call', () => {
    const state = stateWith({
      voiceMap: { [LOUNGE_ID]: { users: { 1: voiceState } } }
    });

    expect(voiceChannelIdByUserIdSelector(state, 3)).toBeUndefined();
  });

  test('should not be fooled by a call that emptied out', () => {
    const state = stateWith({ voiceMap: { [LOUNGE_ID]: { users: {} } } });

    expect(voiceChannelIdByUserIdSelector(state, 1)).toBeUndefined();
  });

  test('should keep one answer per user when asked about another', () => {
    const state = stateWith({
      voiceMap: {
        [LOUNGE_ID]: { users: { 1: voiceState } },
        [CONFERENCE_ID]: { users: { 2: voiceState } }
      }
    });

    expect(voiceChannelIdByUserIdSelector(state, 1)).toBe(LOUNGE_ID);
    expect(voiceChannelIdByUserIdSelector(state, 2)).toBe(CONFERENCE_ID);
    expect(voiceChannelIdByUserIdSelector(state, 1)).toBe(LOUNGE_ID);
  });
});

describe('voiceUserStateSelector', () => {
  test('should read the state of a user in a call', () => {
    const mutedState = { ...voiceState, serverMuted: true };
    const state = stateWith({
      voiceMap: { [LOUNGE_ID]: { users: { 1: mutedState } } }
    });

    expect(voiceUserStateSelector(state, LOUNGE_ID, 1)).toBe(mutedState);
  });

  test('should be undefined for a channel with no call', () => {
    const state = stateWith({});

    expect(voiceUserStateSelector(state, LOUNGE_ID, 1)).toBeUndefined();
  });
});
