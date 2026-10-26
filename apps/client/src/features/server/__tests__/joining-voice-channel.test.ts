import type { IRootState } from '@/features/store';
import type { TVoiceMap, TVoiceUserState } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { isJoiningVoiceChannelSelector } from '../selectors';
import {
  type IServerState,
  serverSliceActions,
  serverSliceReducer
} from '../slice';

const OWN_USER_ID = 1;
const OTHER_USER_ID = 2;
const LOUNGE_ID = 10;
const CONFERENCE_ID = 11;

const voiceState: TVoiceUserState = {
  micMuted: false,
  soundMuted: false,
  webcamEnabled: false,
  sharingScreen: false,
  serverMuted: false
};

const stateWith = ({
  currentVoiceChannelId,
  joiningVoiceChannelId,
  voiceMap = {},
  ownUserId
}: {
  currentVoiceChannelId?: number;
  joiningVoiceChannelId?: number;
  voiceMap?: TVoiceMap;
  ownUserId: number | undefined;
}) =>
  ({
    server: {
      currentVoiceChannelId,
      joiningVoiceChannelId,
      voiceMap,
      ownUserId
    }
  }) as unknown as IRootState;

describe('isJoiningVoiceChannelSelector', () => {
  test('should be joining while the join is out and the server has not listed us yet', () => {
    const state = stateWith({
      currentVoiceChannelId: LOUNGE_ID,
      joiningVoiceChannelId: LOUNGE_ID,
      ownUserId: OWN_USER_ID
    });

    expect(isJoiningVoiceChannelSelector(state, LOUNGE_ID)).toBe(true);
  });

  test('should be joining a call that already has other people in it', () => {
    const state = stateWith({
      currentVoiceChannelId: LOUNGE_ID,
      joiningVoiceChannelId: LOUNGE_ID,
      ownUserId: OWN_USER_ID,
      voiceMap: { [LOUNGE_ID]: { users: { [OTHER_USER_ID]: voiceState } } }
    });

    expect(isJoiningVoiceChannelSelector(state, LOUNGE_ID)).toBe(true);
  });

  // switching calls leaves the old one first, and that clears the current call for the whole
  // round trip. the empty call must not show to the one joining it in the meantime
  test('should be joining the next call while the previous one is still being left', () => {
    const state = stateWith({
      currentVoiceChannelId: undefined,
      joiningVoiceChannelId: CONFERENCE_ID,
      ownUserId: OWN_USER_ID,
      voiceMap: { [LOUNGE_ID]: { users: { [OWN_USER_ID]: voiceState } } }
    });

    expect(isJoiningVoiceChannelSelector(state, CONFERENCE_ID)).toBe(true);
    expect(isJoiningVoiceChannelSelector(state, LOUNGE_ID)).toBe(false);
  });

  test('should stop joining once the server lists us in the call', () => {
    const state = stateWith({
      currentVoiceChannelId: LOUNGE_ID,
      joiningVoiceChannelId: LOUNGE_ID,
      ownUserId: OWN_USER_ID,
      voiceMap: { [LOUNGE_ID]: { users: { [OWN_USER_ID]: voiceState } } }
    });

    expect(isJoiningVoiceChannelSelector(state, LOUNGE_ID)).toBe(false);
  });

  // after a reconnect the server has dropped us from the call while the app still holds it as
  // the current one. nothing is on its way, so the call must not claim to be connecting
  test('should not be joining a current call that does not list us once no join is out', () => {
    const state = stateWith({
      currentVoiceChannelId: LOUNGE_ID,
      ownUserId: OWN_USER_ID,
      voiceMap: { [LOUNGE_ID]: { users: { [OTHER_USER_ID]: voiceState } } }
    });

    expect(isJoiningVoiceChannelSelector(state, LOUNGE_ID)).toBe(false);
  });

  test('should not be joining anything while no join is out', () => {
    const state = stateWith({ ownUserId: OWN_USER_ID });

    expect(isJoiningVoiceChannelSelector(state, LOUNGE_ID)).toBe(false);
  });

  test('should only be joining the call being joined, not another one on screen', () => {
    const state = stateWith({
      currentVoiceChannelId: LOUNGE_ID,
      joiningVoiceChannelId: LOUNGE_ID,
      ownUserId: OWN_USER_ID
    });

    expect(isJoiningVoiceChannelSelector(state, CONFERENCE_ID)).toBe(false);
  });

  test('should not be joining before the own user is known', () => {
    const state = stateWith({
      currentVoiceChannelId: LOUNGE_ID,
      joiningVoiceChannelId: LOUNGE_ID,
      ownUserId: undefined
    });

    expect(isJoiningVoiceChannelSelector(state, LOUNGE_ID)).toBe(false);
  });
});

const joiningState = (joiningVoiceChannelId: number) => {
  const initial = serverSliceReducer(undefined, { type: 'init' });

  return {
    ...initial,
    ownUserId: OWN_USER_ID,
    joiningVoiceChannelId
  } satisfies IServerState;
};

const listedIn = (channelId: number, userId: number) =>
  serverSliceActions.addUserToVoiceChannel({
    channelId,
    userId,
    state: voiceState
  });

describe('joiningVoiceChannelId', () => {
  test('should be cleared by the event that lists us in the call being joined', () => {
    const state = serverSliceReducer(
      joiningState(LOUNGE_ID),
      listedIn(LOUNGE_ID, OWN_USER_ID)
    );

    expect(state.joiningVoiceChannelId).toBeUndefined();
    expect(state.voiceMap[LOUNGE_ID]?.users[OWN_USER_ID]).toEqual(voiceState);
  });

  test('should be kept when someone else joins the call', () => {
    const state = serverSliceReducer(
      joiningState(LOUNGE_ID),
      listedIn(LOUNGE_ID, OTHER_USER_ID)
    );

    expect(state.joiningVoiceChannelId).toBe(LOUNGE_ID);
  });

  // picking another call while a join is out replaces it, and the first join landing late
  // must not end the placeholder of the one being joined now
  test('should be kept when we are listed in a call this join replaced', () => {
    const state = serverSliceReducer(
      joiningState(CONFERENCE_ID),
      listedIn(LOUNGE_ID, OWN_USER_ID)
    );

    expect(state.joiningVoiceChannelId).toBe(CONFERENCE_ID);
  });

  test('should be cleared by a fresh connection', () => {
    const state = serverSliceReducer(
      joiningState(LOUNGE_ID),
      serverSliceActions.setInitialData({
        serverId: 'server',
        categories: [],
        channels: [],
        users: [],
        ownUserId: OWN_USER_ID,
        ownUserPasswordSet: true,
        roles: [],
        emojis: [],
        publicSettings: undefined,
        voiceMap: {},
        externalStreamsMap: {},
        channelPermissions: {},
        readStates: {},
        followedThreads: {},
        directMessages: [],
        pluginsMetadata: []
      })
    );

    expect(state.joiningVoiceChannelId).toBeUndefined();
  });
});
