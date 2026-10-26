import { useIsVoiceChatSidebarOpen } from '@/features/app/hooks';
import {
  useIsJoiningVoiceChannel,
  useVoiceUsersByChannelId
} from '@/features/server/hooks';
import type { TVoiceUser } from '@/features/server/types';
import { useOwnUserId } from '@/features/server/users/hooks';
import {
  useHideNonVideoParticipants,
  useHideOwnScreenShare,
  useOwnVoiceState,
  useVoice,
  useVoiceChannelExternalStreamsList
} from '@/features/server/voice/hooks';
import {
  CALL_CHAT_SCREEN_QUERY,
  TOP_BAR_HIDDEN_QUERY
} from '@/helpers/call-chat-layout';
import { useMediaQuery } from '@/hooks/use-media-query';
import { TestId } from '@sharkord/shared';
import { memo, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CallChat } from './call-chat';
import { CallHeader } from './call-header';
import { ControlsBar } from './controls-bar';
import { ExternalStreamCard } from './external-stream-card';
import { usePinCardController } from './hooks/use-pin-card-controller';
import { JoiningCard } from './joining-card';
import { ScreenShareCard } from './screen-share-card';
import { VoiceGrid } from './voice-grid';
import { VoiceUserCard } from './voice-user-card';

type TChannelProps = {
  channelId: number;
};

const VoiceChannel = memo(({ channelId }: TChannelProps) => {
  const { t } = useTranslation('common');
  const voiceUsers = useVoiceUsersByChannelId(channelId);
  const externalStreams = useVoiceChannelExternalStreamsList(channelId);
  const { pinnedCard, pinCard, unpinCard, isPinned } = usePinCardController();
  const hideNonVideoParticipants = useHideNonVideoParticipants();
  const hideOwnScreenShare = useHideOwnScreenShare();
  const ownUserId = useOwnUserId();
  const ownVoiceState = useOwnVoiceState();
  const { localScreenShareStream } = useVoice();
  const isJoining = useIsJoiningVoiceChannel(channelId);
  const isChatOpen = useIsVoiceChatSidebarOpen();
  const isChatScreen = useMediaQuery(CALL_CHAT_SCREEN_QUERY);
  const isTopBarHidden = useMediaQuery(TOP_BAR_HIDDEN_QUERY);
  // the open chat's buttons go where the chat is: its own header when it is a screen, the top
  // bar from lg up, and between the two the call's header right above it
  const showChatActionsInCallHeader =
    isChatOpen && isTopBarHidden && !isChatScreen;
  const isAnyCardPinned = pinnedCard !== undefined;
  // your own share shows as soon as its stream is yours, rather than after the server has
  // echoed it back. the stream check keeps an empty cell out while the picker is still open
  const isOwnScreenShareLive =
    ownVoiceState.sharingScreen && !!localScreenShareStream;

  const cards = useMemo(() => {
    const cards: ReactNode[] = [];

    const isSharingScreen = (voiceUser: TVoiceUser) => {
      if (voiceUser.id === ownUserId) {
        return isOwnScreenShareLive;
      }

      return voiceUser.state.sharingScreen;
    };

    // Check if there are any video streams at all
    const hasAnyVideoStreams =
      voiceUsers.some(
        (user) => user.state.webcamEnabled || isSharingScreen(user)
      ) || externalStreams.some((stream) => stream.tracks.video);

    // Only apply the filter if there are some video streams
    const shouldFilterNonVideo = hideNonVideoParticipants && hasAnyVideoStreams;

    // the users come ordered by id, so the placeholder goes where your own card will land and
    // the real one takes over the same cell
    let needsJoiningCard =
      isJoining && ownUserId !== undefined && !shouldFilterNonVideo;

    const pushJoiningCard = () => {
      cards.push(<JoiningCard key={`user-${ownUserId}`} />);
      needsJoiningCard = false;
    };

    voiceUsers.forEach((voiceUser) => {
      if (
        needsJoiningCard &&
        ownUserId !== undefined &&
        voiceUser.id > ownUserId
      ) {
        pushJoiningCard();
      }

      const userCardId = `user-${voiceUser.id}`;
      const hasVideo = voiceUser.state.webcamEnabled;

      // Only show user card if not filtering, or if they have video
      if (!shouldFilterNonVideo || hasVideo) {
        cards.push(
          <VoiceUserCard
            key={userCardId}
            userId={voiceUser.id}
            channelId={channelId}
            isPinned={isPinned(userCardId)}
            isAnyCardPinned={isAnyCardPinned}
            cardId={userCardId}
            onPin={pinCard}
            onUnpin={unpinCard}
            voiceUser={voiceUser}
          />
        );
      }

      // Screen shares always have video, so always show them
      const shouldHideOwnScreenShare =
        hideOwnScreenShare && voiceUser.id === ownUserId;
      if (isSharingScreen(voiceUser) && !shouldHideOwnScreenShare) {
        const screenShareCardId = `screen-share-${voiceUser.id}`;

        cards.push(
          <ScreenShareCard
            key={screenShareCardId}
            userId={voiceUser.id}
            isPinned={isPinned(screenShareCardId)}
            isAnyCardPinned={isAnyCardPinned}
            cardId={screenShareCardId}
            onPin={pinCard}
            onUnpin={unpinCard}
            showPinControls
          />
        );
      }
    });

    if (needsJoiningCard) {
      pushJoiningCard();
    }

    externalStreams.forEach((stream) => {
      const externalStreamCardId = `external-stream-${stream.streamId}`;
      const hasVideo = stream.tracks.video;

      // Only show external stream card if not filtering, or if it has video
      if (!shouldFilterNonVideo || hasVideo) {
        cards.push(
          <ExternalStreamCard
            key={externalStreamCardId}
            streamId={stream.streamId}
            stream={stream}
            isPinned={isPinned(externalStreamCardId)}
            isAnyCardPinned={isAnyCardPinned}
            cardId={externalStreamCardId}
            onPin={pinCard}
            onUnpin={unpinCard}
            showPinControls
          />
        );
      }
    });

    return cards;
  }, [
    voiceUsers,
    externalStreams,
    channelId,
    isPinned,
    pinCard,
    unpinCard,
    hideNonVideoParticipants,
    hideOwnScreenShare,
    ownUserId,
    isAnyCardPinned,
    isJoining,
    isOwnScreenShareLive
  ]);

  let stage: ReactNode;

  if (voiceUsers.length === 0 && !isJoining) {
    stage = (
      <div
        data-testid={TestId.VOICE_CHANNEL_EMPTY}
        className="flex flex-1 items-center justify-center text-center"
      >
        <div>
          <p className="text-muted-foreground text-lg mb-2">
            {t('voiceChannelEmpty')}
          </p>
          <p className="text-muted-foreground text-sm">
            {t('voiceChannelEmptyHint')}
          </p>
        </div>
      </div>
    );
  } else {
    stage = (
      <>
        <VoiceGrid pinnedCardId={pinnedCard?.id}>{cards}</VoiceGrid>
        <ControlsBar channelId={channelId} />
      </>
    );
  }

  // one box for the header, the call and its chat, so the layout is right on the first frame
  // instead of being rearranged after it. isolate keeps the phone chat's stacking inside it
  return (
    <div className="relative isolate flex size-full flex-col overflow-hidden">
      <CallHeader
        channelId={channelId}
        showChatActions={showChatActionsInCallHeader}
      />
      <div
        data-testid={TestId.VOICE_STAGE}
        className="relative flex min-h-50 flex-1 flex-col bg-background overflow-hidden group/voice-stage"
      >
        {stage}
      </div>
      {isChatOpen && <CallChat channelId={channelId} isScreen={isChatScreen} />}
    </div>
  );
});

export { VoiceChannel };
