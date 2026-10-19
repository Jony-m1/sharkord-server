import type { IRootState } from '@/features/store';
import { createSelector } from '@reduxjs/toolkit';
import { createCachedSelector } from 're-reselect';

export const directMessagesSelector = (state: IRootState) =>
  state.server.directMessages;

export const visibleDirectMessagesSelector = createSelector(
  [directMessagesSelector],
  (conversations) =>
    conversations.filter(
      ({ closedAt, lastMessageAt }) =>
        closedAt === null || lastMessageAt > closedAt
    )
);

// who a direct message channel is with, for its header
export const directMessageUserIdByChannelIdSelector = createCachedSelector(
  [directMessagesSelector, (_: IRootState, channelId: number) => channelId],
  (conversations, channelId) => {
    const conversation = conversations.find((dm) => dm.channelId === channelId);

    if (!conversation) return undefined;

    return conversation.userId;
  }
)((_, channelId) => channelId);
