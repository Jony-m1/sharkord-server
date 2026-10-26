import { ChannelHeaderActions } from '@/components/channel-view/text/channel-header-actions';
import { MembersDrawerToggle } from '@/components/members-drawer-toggle';
import { MobileBackButton } from '@/components/mobile-back-button';
import { VoiceChatToggle } from '@/components/top-bar/voice-chat-toggle';
import { useChannelById } from '@/features/server/channels/hooks';
import { TestId } from '@sharkord/shared';
import { Volume2 } from 'lucide-react';
import { memo } from 'react';

type TCallHeaderProps = {
  channelId: number;
  showChatActions: boolean;
};

// the top bar with the chat and members toggles only shows from lg up, so below that the call
// carries a header of its own with the way back, its name and both toggles, and the buttons of
// its chat while that sits under the call
const CallHeader = memo(({ channelId, showChatActions }: TCallHeaderProps) => {
  const channel = useChannelById(channelId);

  return (
    <div
      data-testid={TestId.VOICE_CALL_HEADER}
      className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-4 lg:hidden"
    >
      <div className="flex min-w-0 items-center gap-2">
        <MobileBackButton />
        <Volume2 className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate font-bold">{channel?.name}</span>
      </div>
      <div className="flex items-center gap-2">
        {showChatActions && <ChannelHeaderActions channelId={channelId} />}
        <VoiceChatToggle
          channelId={channelId}
          testId={TestId.VOICE_CALL_CHAT_TOGGLE}
        />
        <MembersDrawerToggle />
      </div>
    </div>
  );
});

export { CallHeader };
