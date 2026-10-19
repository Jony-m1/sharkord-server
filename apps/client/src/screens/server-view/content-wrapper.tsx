import { TextChannel } from '@/components/channel-view/text';
import { VoiceChannel } from '@/components/channel-view/voice';
import { MobileBackButton } from '@/components/mobile-back-button';
import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { ThreadContent } from '@/components/thread-sidebar/thread-content';
import { setSelectedThread } from '@/features/app/actions';
import { useSelectedThread } from '@/features/app/hooks';
import {
  useSelectedChannelId,
  useSelectedChannelType
} from '@/features/server/channels/hooks';
import { useActiveFullscreenPluginId } from '@/features/server/hooks';
import { useThreadsOpen } from '@/features/server/threads/hooks';
import { ChannelType, PluginSlot } from '@sharkord/shared';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TContentWrapperProps = {
  isDmMode: boolean;
  selectedDmChannelId?: number;
};

const ContentWrapper = memo(
  ({ isDmMode, selectedDmChannelId }: TContentWrapperProps) => {
    const { t } = useTranslation();
    const selectedChannelId = useSelectedChannelId();
    const selectedChannelType = useSelectedChannelType();
    const activeFullscreenPluginId = useActiveFullscreenPluginId();
    const threadsOpen = useThreadsOpen();
    const selectedThread = useSelectedThread();

    const onCloseThread = useCallback(() => setSelectedThread(undefined), []);

    if (activeFullscreenPluginId) {
      return (
        <main className="flex flex-1 flex-col bg-background relative min-w-0 min-h-0">
          <div className="flex-col gap-2 h-full w-full flex overflow-auto relative bg-background">
            <MobileBackButton className="absolute top-2 left-3 z-20 rounded-full bg-background/70" />
            <PluginSlotRenderer
              slotId={PluginSlot.FULL_SCREEN}
              onlyPluginId={activeFullscreenPluginId}
            />
          </div>
        </main>
      );
    }

    let content;

    if (threadsOpen) {
      if (selectedThread) {
        content = (
          <ThreadContent
            key={selectedThread.parentMessageId}
            parentMessageId={selectedThread.parentMessageId}
            channelId={selectedThread.channelId}
            onClose={onCloseThread}
          />
        );
      } else {
        content = (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {t('selectThreadPrompt')}
          </div>
        );
      }

      return (
        <main className="flex flex-1 flex-col bg-background relative min-w-0 min-h-0">
          {content}
        </main>
      );
    }

    if (isDmMode) {
      if (selectedDmChannelId) {
        content = (
          <TextChannel
            key={selectedDmChannelId}
            channelId={selectedDmChannelId}
          />
        );
      } else {
        content = (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {t('selectDmPrompt')}
          </div>
        );
      }

      return (
        <main className="flex flex-1 flex-col bg-background relative min-w-0 min-h-0">
          {content}
        </main>
      );
    }

    if (selectedChannelId) {
      if (selectedChannelType === ChannelType.TEXT) {
        content = (
          <TextChannel key={selectedChannelId} channelId={selectedChannelId} />
        );
      } else if (selectedChannelType === ChannelType.VOICE) {
        content = (
          <VoiceChannel key={selectedChannelId} channelId={selectedChannelId} />
        );
      }
    } else {
      // on a phone the channel list covers this, so there is nothing to show under it
      content = (
        <div className="flex-col gap-2 h-full w-full hidden lg:flex overflow-auto">
          <PluginSlotRenderer slotId={PluginSlot.HOME_SCREEN} />
        </div>
      );
    }

    return (
      <main className="flex flex-1 flex-col bg-background relative min-w-0 min-h-0">
        {content}
      </main>
    );
  }
);

export { ContentWrapper };
