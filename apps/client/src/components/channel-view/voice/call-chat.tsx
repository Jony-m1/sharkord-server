import { ChannelHeaderActions } from '@/components/channel-view/text/channel-header-actions';
import { Conversation } from '@/components/channel-view/text/conversation';
import { closeVoiceChatSidebar } from '@/features/app/actions';
import { useChannelById } from '@/features/server/channels/hooks';
import { LocalStorageKey } from '@/helpers/storage';
import { useResizableSidebar } from '@/hooks/use-resizable-sidebar';
import { cn } from '@/lib/utils';
import { TestId } from '@sharkord/shared';
import { IconButton } from '@sharkord/ui';
import { ArrowLeft, Volume2 } from 'lucide-react';
import { memo, useMemo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

const MIN_HEIGHT = 160;
const MAX_HEIGHT = 1200;
const DEFAULT_HEIGHT = 360;

// the chat's own header when it is a screen of its own, otherwise the call's header below lg
// or the top bar from lg up, carries its name and its buttons
const renderNoHeader = () => null;

type TCallChatProps = {
  channelId: number;
  isScreen: boolean;
};

// under the call, the call keeps its own minimum height through the layout when the saved
// height no longer fits. where the two do not fit one above the other (CALL_CHAT_SCREEN_QUERY)
// it is a screen of its own that slides in over the call and closes straight back to it
const CallChat = memo(({ channelId, isScreen }: TCallChatProps) => {
  const { t } = useTranslation('topbar');
  const channel = useChannelById(channelId);
  const { size, isResizing, sidebarRef, handlePointerDown } =
    useResizableSidebar({
      storageKey: LocalStorageKey.VOICE_CHAT_HEIGHT,
      minSize: MIN_HEIGHT,
      maxSize: MAX_HEIGHT,
      defaultSize: DEFAULT_HEIGHT,
      edge: 'top'
    });

  const style = useMemo(
    () => ({ '--call-chat-height': `${size}px` }) as CSSProperties,
    [size]
  );

  return (
    <div
      ref={sidebarRef}
      data-testid={TestId.VOICE_CHAT}
      style={style}
      className={cn(
        'flex flex-col bg-card',
        isScreen
          ? 'absolute inset-0 z-30 motion-safe:animate-in slide-in-from-right duration-[260ms] ease-[cubic-bezier(.32,.72,0,1)]'
          : 'relative h-(--call-chat-height) min-h-40 border-t border-border'
      )}
    >
      {isScreen && (
        <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-2">
          <div className="flex min-w-0 items-center gap-2">
            <IconButton
              icon={ArrowLeft}
              variant="ghost"
              onClick={closeVoiceChatSidebar}
              aria-label={t('backToCall')}
              data-testid={TestId.VOICE_CHAT_BACK}
              className="size-9"
            />
            <Volume2 className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-bold">{channel?.name}</span>
          </div>
          <div className="flex items-center gap-2 pr-2">
            <ChannelHeaderActions channelId={channelId} />
          </div>
        </div>
      )}
      {!isScreen && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label={t('resizeVoiceChat')}
          data-testid={TestId.VOICE_CHAT_RESIZE}
          data-no-swipe
          onPointerDown={handlePointerDown}
          className={cn(
            'absolute inset-x-0 -top-0.5 z-20 h-1 cursor-row-resize touch-none transition-colors hover:bg-primary/50',
            'before:absolute before:inset-x-0 before:-inset-y-2',
            isResizing && 'bg-primary'
          )}
        />
      )}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <Conversation
          key={channelId}
          channelId={channelId}
          renderHeader={renderNoHeader}
        />
      </div>
    </div>
  );
});

export { CallChat };
