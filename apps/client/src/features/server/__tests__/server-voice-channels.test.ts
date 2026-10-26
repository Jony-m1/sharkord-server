import type { IRootState } from '@/features/store';
import {
  ChannelType,
  type TChannel,
  type TVoiceMap,
  type TVoiceUserState
} from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { serverVoiceChannelsSelector } from '../channels/selectors';
import {
  visibleServerVoiceChannelIdByUserIdSelector,
  voiceMoveTargetsByUserIdSelector
} from '../selectors';

const TEXT_ID = 1;
const LOUNGE_ID = 10;
const CONFERENCE_ID = 11;
const DM_CALL_ID = 12;
// a private channel this client was not given, though its call still reaches the voice map
const HIDDEN_ID = 13;

const voiceState: TVoiceUserState = {
  micMuted: false,
  soundMuted: false,
  webcamEnabled: false,
  sharingScreen: false,
  serverMuted: false
};

const channel = (id: number, type: ChannelType, isDm = false) =>
  ({ id, name: `channel-${id}`, type, isDm }) as TChannel;

const CHANNELS = [
  channel(TEXT_ID, ChannelType.TEXT),
  channel(LOUNGE_ID, ChannelType.VOICE),
  channel(DM_CALL_ID, ChannelType.VOICE, true),
  channel(CONFERENCE_ID, ChannelType.VOICE)
];

const stateWith = ({
  voiceMap = {},
  channels = CHANNELS
}: {
  voiceMap?: TVoiceMap;
  channels?: TChannel[];
}) => ({ server: { voiceMap, channels } }) as unknown as IRootState;

const inCall = (channelId: number, userId: number): TVoiceMap => ({
  [channelId]: { users: { [userId]: voiceState } }
});

describe('serverVoiceChannelsSelector', () => {
  test('should list the server voice channels only', () => {
    const state = stateWith({});

    expect(serverVoiceChannelsSelector(state).map(({ id }) => id)).toEqual([
      LOUNGE_ID,
      CONFERENCE_ID
    ]);
  });

  test('should hand back the same list for an unchanged state', () => {
    const state = stateWith({});

    expect(serverVoiceChannelsSelector(state)).toBe(
      serverVoiceChannelsSelector(state)
    );
  });
});

describe('visibleServerVoiceChannelIdByUserIdSelector', () => {
  test('should find a call in a server voice channel this client can see', () => {
    const state = stateWith({ voiceMap: inCall(LOUNGE_ID, 2) });

    expect(visibleServerVoiceChannelIdByUserIdSelector(state, 2)).toBe(
      LOUNGE_ID
    );
  });

  // every client hears about every call, so a private channel it was not given must not show
  test('should hide a call in a channel this client cannot see', () => {
    const state = stateWith({ voiceMap: inCall(HIDDEN_ID, 2) });

    expect(
      visibleServerVoiceChannelIdByUserIdSelector(state, 2)
    ).toBeUndefined();
  });

  test('should never hand over a dm call', () => {
    const state = stateWith({ voiceMap: inCall(DM_CALL_ID, 2) });

    expect(
      visibleServerVoiceChannelIdByUserIdSelector(state, 2)
    ).toBeUndefined();
  });

  test('should be undefined for a user in no call', () => {
    const state = stateWith({ voiceMap: inCall(LOUNGE_ID, 2) });

    expect(
      visibleServerVoiceChannelIdByUserIdSelector(state, 3)
    ).toBeUndefined();
  });
});

describe('voiceMoveTargetsByUserIdSelector', () => {
  test('should offer every server voice channel but the one the user is in', () => {
    const state = stateWith({ voiceMap: inCall(LOUNGE_ID, 2) });

    expect(
      voiceMoveTargetsByUserIdSelector(state, 2).map(({ id }) => id)
    ).toEqual([CONFERENCE_ID]);
  });

  test('should offer every server voice channel to a user in no call', () => {
    const state = stateWith({});

    expect(
      voiceMoveTargetsByUserIdSelector(state, 2).map(({ id }) => id)
    ).toEqual([LOUNGE_ID, CONFERENCE_ID]);
  });

  test('should hand back the same list for an unchanged state', () => {
    const state = stateWith({ voiceMap: inCall(LOUNGE_ID, 2) });

    expect(voiceMoveTargetsByUserIdSelector(state, 2)).toBe(
      voiceMoveTargetsByUserIdSelector(state, 2)
    );
  });
});
