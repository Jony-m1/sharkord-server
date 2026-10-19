import type { IRootState } from '@/features/store';
import type { TDirectMessageConversation } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { directMessageUserIdByChannelIdSelector } from '../selectors';

const conversation = (
  channelId: number,
  userId: number
): TDirectMessageConversation => ({
  channelId,
  userId,
  lastMessageAt: 0,
  closedAt: null
});

const stateWith = (directMessages: TDirectMessageConversation[]) =>
  ({ server: { directMessages } }) as unknown as IRootState;

describe('directMessageUserIdByChannelIdSelector', () => {
  test('should name the person a conversation is with', () => {
    const state = stateWith([conversation(10, 2), conversation(11, 3)]);

    expect(directMessageUserIdByChannelIdSelector(state, 11)).toBe(3);
  });

  test('should return undefined for a channel that is not a conversation', () => {
    const state = stateWith([conversation(10, 2)]);

    expect(directMessageUserIdByChannelIdSelector(state, 99)).toBeUndefined();
  });
});
