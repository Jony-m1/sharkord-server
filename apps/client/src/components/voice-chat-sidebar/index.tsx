import { Conversation } from '@/components/channel-view/text/conversation';
import { ResizableSidebar } from '@/components/resizable-sidebar';
import { useIsVoiceChatSidebarOpen } from '@/features/app/hooks';
import { useVoiceViewChannelId } from '@/features/server/channels/hooks';
import { LocalStorageKey } from '@/helpers/storage';
import { TestId } from '@sharkord/shared';
import { memo } from 'react';

const MIN_WIDTH = 360;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 384;

// the call's own top bar carries the channel's topic and buttons, so the chat has no header
const renderNoHeader = () => null;

const VoiceChatSidebar = memo(() => {
  const channelId = useVoiceViewChannelId();
  const isOpen = useIsVoiceChatSidebarOpen();

  if (!channelId) {
    return null;
  }

  return (
    <ResizableSidebar
      storageKey={LocalStorageKey.VOICE_CHAT_SIDEBAR_WIDTH}
      minWidth={MIN_WIDTH}
      maxWidth={MAX_WIDTH}
      defaultWidth={DEFAULT_WIDTH}
      edge="left"
      isOpen={isOpen}
      className="hidden lg:flex"
      data-testid={TestId.VOICE_CHAT}
    >
      <div className="flex flex-col h-full w-full">
        <div className="flex-1 flex flex-col overflow-hidden">
          <Conversation
            key={channelId}
            channelId={channelId}
            renderHeader={renderNoHeader}
          />
        </div>
      </div>
    </ResizableSidebar>
  );
});

export { VoiceChatSidebar };
