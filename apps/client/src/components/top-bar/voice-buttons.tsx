import { toggleVoiceChatSidebar } from '@/features/app/actions';
import { useVisibleVoiceChatChannelId } from '@/features/server/channels/hooks';
import {
  useHasUnreadMentions,
  useUnreadMessagesCount
} from '@/features/server/hooks';
import { cn } from '@/lib/utils';
import { TestId } from '@sharkord/shared';
import { Button, Tooltip } from '@sharkord/ui';
import { MessageSquare } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { UnreadCount } from '../unread-count';
import { VoiceOptionsController } from './voice-options-controller';
import { VolumeController } from './volume-controller';

type TVoiceButtonsProps = {
  currentVoiceChannelId: number;
};

const VoiceButtons = memo(({ currentVoiceChannelId }: TVoiceButtonsProps) => {
  const { t } = useTranslation('topbar');
  const visibleVoiceChatChannelId = useVisibleVoiceChatChannelId();
  const isVoiceChatOpen = visibleVoiceChatChannelId === currentVoiceChannelId;

  const currentVoiceChannelUnreadCount = useUnreadMessagesCount(
    currentVoiceChannelId
  );
  const currentVoiceChannelHasUnreadMentions = useHasUnreadMentions(
    currentVoiceChannelId
  );

  return (
    <>
      <VoiceOptionsController />
      <VolumeController channelId={currentVoiceChannelId} />
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleVoiceChatSidebar}
        data-testid={TestId.VOICE_CHAT_TOGGLE}
        className="h-7 px-2 transition-all duration-200 ease-in-out"
      >
        <Tooltip
          content={isVoiceChatOpen ? t('closeVoiceChat') : t('openVoiceChat')}
          asChild={false}
        >
          <div className="relative flex items-center justify-center">
            <MessageSquare
              className={cn(
                'w-4 h-4 transition-all duration-200 ease-in-out',
                isVoiceChatOpen && 'fill-current'
              )}
            />
            <UnreadCount
              count={currentVoiceChannelUnreadCount}
              hasMention={currentVoiceChannelHasUnreadMentions}
              className="absolute -top-2 -right-3 ml-0 min-w-4 h-4 px-1 text-[10px] leading-none"
            />
          </div>
        </Tooltip>
      </Button>
    </>
  );
});

export { VoiceButtons };
