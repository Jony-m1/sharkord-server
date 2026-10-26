import { toggleVoiceChatSidebar } from '@/features/app/actions';
import { useVisibleVoiceChatChannelId } from '@/features/server/channels/hooks';
import {
  useHasUnreadMentions,
  useUnreadMessagesCount
} from '@/features/server/hooks';
import { cn } from '@/lib/utils';
import type { TestId } from '@sharkord/shared';
import { Button, Tooltip } from '@sharkord/ui';
import { MessagesSquare } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { UnreadCount } from '../unread-count';

type TVoiceChatToggleProps = {
  channelId: number;
  testId: TestId;
  className?: string;
};

// deliberately not lucide's message-square: desktop builds from before the chat moved under the
// call click the first button carrying that icon whenever a call shows, which closes this chat
const VoiceChatToggle = memo(
  ({ channelId, testId, className }: TVoiceChatToggleProps) => {
    const { t } = useTranslation('topbar');
    const visibleVoiceChatChannelId = useVisibleVoiceChatChannelId();
    const unreadCount = useUnreadMessagesCount(channelId);
    const hasUnreadMentions = useHasUnreadMentions(channelId);
    const isOpen = visibleVoiceChatChannelId === channelId;
    const label = isOpen ? t('closeVoiceChat') : t('openVoiceChat');

    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleVoiceChatSidebar}
        aria-label={label}
        aria-pressed={isOpen}
        data-testid={testId}
        className={cn('h-7 px-2', className)}
      >
        <Tooltip content={label} asChild={false}>
          <div className="relative flex items-center justify-center">
            <MessagesSquare
              className={cn('size-4', isOpen && 'fill-current')}
            />
            <UnreadCount
              count={unreadCount}
              hasMention={hasUnreadMentions}
              className="absolute -top-2 -right-3 ml-0 min-w-4 h-4 px-1 text-[10px] leading-none"
            />
          </div>
        </Tooltip>
      </Button>
    );
  }
);

export { VoiceChatToggle };
