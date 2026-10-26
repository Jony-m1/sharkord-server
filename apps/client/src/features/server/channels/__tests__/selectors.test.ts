import type { IRootState } from '@/features/store';
import { ChannelType, type TChannel } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import {
  channelByIdSelector,
  channelsByCategoryIdSelector,
  isChannelTextVisibleByIdSelector,
  visibleVoiceChatChannelIdSelector,
  voiceViewChannelIdSelector
} from '../selectors';

const channel = (id: number, categoryId: number, position: number) =>
  ({
    id,
    categoryId,
    position,
    name: `channel-${id}`,
    type: ChannelType.TEXT,
    private: false
  }) as TChannel;

const stateWith = (channels: TChannel[]) =>
  ({ server: { channels } }) as unknown as IRootState;

describe('channelByIdSelector', () => {
  test('should resolve a channel by its id', () => {
    const state = stateWith([channel(1, 1, 0), channel(2, 1, 1)]);

    expect(channelByIdSelector(state, 2)?.name).toBe('channel-2');
  });

  test('should return undefined for an id the state does not hold', () => {
    const state = stateWith([channel(1, 1, 0)]);

    expect(channelByIdSelector(state, 99)).toBeUndefined();
  });

  // asking for one channel must not throw away the answer for another. this does not prove
  // createCachedSelector is doing it: reselect 5 memoizes per input combination too, and the
  // test still passes with a plain createSelector (measured). it pins the behaviour, not the
  // library, which is the honest claim to make after T3
  test('should not evict one id when asked for another', () => {
    const state = stateWith([channel(1, 1, 0), channel(2, 1, 1)]);

    const first = channelByIdSelector(state, 1);

    channelByIdSelector(state, 2);

    expect(channelByIdSelector(state, 1)).toBe(first);
  });

  test('should hand back the same reference for an unchanged state', () => {
    const state = stateWith([channel(1, 1, 0)]);

    expect(channelByIdSelector(state, 1)).toBe(channelByIdSelector(state, 1));
  });
});

describe('channelsByCategoryIdSelector', () => {
  test('should return only the channels of that category', () => {
    const state = stateWith([
      channel(1, 1, 0),
      channel(2, 2, 0),
      channel(3, 1, 1)
    ]);

    expect(channelsByCategoryIdSelector(state, 1).map((c) => c.id)).toEqual([
      1, 3
    ]);
  });

  test('should order by position and break ties by id', () => {
    const state = stateWith([
      channel(5, 1, 2),
      channel(3, 1, 1),
      channel(1, 1, 1)
    ]);

    expect(channelsByCategoryIdSelector(state, 1).map((c) => c.id)).toEqual([
      1, 3, 5
    ]);
  });

  test('should return a stable reference for an unchanged state', () => {
    const state = stateWith([channel(1, 1, 0)]);

    expect(channelsByCategoryIdSelector(state, 1)).toBe(
      channelsByCategoryIdSelector(state, 1)
    );
  });
});

describe('the voice chat', () => {
  const lounge = { ...channel(1, 1, 0), type: ChannelType.VOICE };
  const conference = { ...channel(2, 1, 1), type: ChannelType.VOICE };
  const general = channel(3, 1, 2);

  const callState = ({
    selectedChannelId,
    voiceChatSidebarOpen = true,
    dmsOpen = false,
    threadsOpen = false
  }: {
    selectedChannelId: number | undefined;
    voiceChatSidebarOpen?: boolean;
    dmsOpen?: boolean;
    threadsOpen?: boolean;
  }) =>
    ({
      server: {
        channels: [lounge, conference, general],
        selectedChannelId,
        dmsOpen,
        threadsOpen
      },
      app: { voiceChatSidebarOpen }
    }) as unknown as IRootState;

  test('should show the chat of the call on screen, so switching calls takes it along', () => {
    expect(
      visibleVoiceChatChannelIdSelector(callState({ selectedChannelId: 1 }))
    ).toBe(1);
    expect(
      visibleVoiceChatChannelIdSelector(callState({ selectedChannelId: 2 }))
    ).toBe(2);
  });

  test('should show nothing while it is closed, though the call stays on screen', () => {
    const state = callState({
      selectedChannelId: 2,
      voiceChatSidebarOpen: false
    });

    expect(voiceViewChannelIdSelector(state)).toBe(2);
    expect(visibleVoiceChatChannelIdSelector(state)).toBeUndefined();
  });

  test('should not follow you to a text channel', () => {
    expect(
      visibleVoiceChatChannelIdSelector(callState({ selectedChannelId: 3 }))
    ).toBeUndefined();
  });

  test('should step aside for direct messages and threads, which take the content area', () => {
    expect(
      visibleVoiceChatChannelIdSelector(
        callState({ selectedChannelId: 2, dmsOpen: true })
      )
    ).toBeUndefined();
    expect(
      visibleVoiceChatChannelIdSelector(
        callState({ selectedChannelId: 2, threadsOpen: true })
      )
    ).toBeUndefined();
  });

  test('should count as read only the chat that is on screen', () => {
    const state = callState({ selectedChannelId: 2 });

    expect(isChannelTextVisibleByIdSelector(state, 2)).toBe(true);
    expect(isChannelTextVisibleByIdSelector(state, 1)).toBe(false);
  });
});
