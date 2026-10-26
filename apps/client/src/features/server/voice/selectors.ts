import type { IRootState } from '@/features/store';
import { createCachedSelector } from 're-reselect';
import type { TVoiceReaction } from '../types';

const DEFAULT_OBJECT = {};
const DEFAULT_ARRAY: TVoiceReaction[] = [];

export const ownVoiceStateSelector = (state: IRootState) => {
  return state.server.ownVoiceState;
};

export const pinnedCardSelector = (state: IRootState) =>
  state.server.pinnedCard;

export const voiceMoveTargetChannelIdSelector = (state: IRootState) =>
  state.server.voiceMoveTargetChannelId;

export const joiningVoiceChannelIdSelector = (state: IRootState) =>
  state.server.joiningVoiceChannelId;

export const voiceChannelStateSelector = (
  state: IRootState,
  channelId: number
) => state.server.voiceMap[channelId];

export const callStartedAtSelector = (state: IRootState, channelId: number) =>
  state.server.voiceMap[channelId]?.startedAt;

const voiceMapSelector = (state: IRootState) => state.server.voiceMap;

// the call someone is in. the server tells every client about every call, private channels
// included, so this is not limited to what the client can see: anything shown from it has to
// check visibility, as visibleServerVoiceChannelIdByUserIdSelector does
export const voiceChannelIdByUserIdSelector = createCachedSelector(
  [voiceMapSelector, (_: IRootState, userId: number) => userId],
  (voiceMap, userId) => {
    for (const [channelId, channel] of Object.entries(voiceMap)) {
      if (channel.users[userId]) return Number(channelId);
    }

    return undefined;
  }
)((_, userId: number) => userId);

export const voiceUserStateSelector = (
  state: IRootState,
  channelId: number,
  userId: number
) => state.server.voiceMap[channelId]?.users[userId];

export const callJoinedAtSelector = (
  state: IRootState,
  channelId: number,
  userId: number
) => state.server.voiceMap[channelId]?.joinedAt?.[userId];

export const voiceChannelExternalStreamsSelector = (
  state: IRootState,
  channelId: number
) => state.server.externalStreamsMap[channelId];

export const voiceChannelExternalStreamsListSelector = createCachedSelector(
  voiceChannelExternalStreamsSelector,
  (externalStreamsMap) => {
    return Object.entries(externalStreamsMap || DEFAULT_OBJECT).map(
      ([streamId, stream]) => ({
        streamId: Number(streamId),
        ...stream
      })
    );
  }
)((_state: IRootState, channelId: number) => channelId);

export const voiceChannelAudioExternalStreamsSelector = createCachedSelector(
  voiceChannelExternalStreamsListSelector,
  (externalStreams) =>
    externalStreams.filter((stream) => stream.tracks?.audio === true)
)((_state: IRootState, channelId: number) => channelId);

export const voiceReactionsSelector = (state: IRootState, userId: number) =>
  state.server.voiceReactions[userId] || DEFAULT_ARRAY;

export const hideNonVideoParticipantsSelector = (state: IRootState) =>
  state.server.hideNonVideoParticipants;

export const showUserBannersInVoiceSelector = (state: IRootState) =>
  state.server.showUserBannersInVoice;

export const hideOwnScreenShareSelector = (state: IRootState) =>
  state.server.hideOwnScreenShare;

export const alwaysShowVoiceControlsSelector = (state: IRootState) =>
  state.server.alwaysShowVoiceControls;
