import { RelativeTime } from '@/components/relative-time';
import { setMessageJumpTarget } from '@/features/app/actions';
import { useChannelById } from '@/features/server/channels/hooks';
import { useUserById } from '@/features/server/users/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError, TestId, type TJoinedMessage } from '@sharkord/shared';
import {
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Spinner,
  Tooltip
} from '@sharkord/ui';
import { format } from 'date-fns';
import { ArrowRight, Pin } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { MessagesGroup } from './messages-group';

type TPinnedMessageGroupWrapperProps = {
  message: TJoinedMessage;
  onScrollToMessage: (messageId: number) => void;
};

type TScrollToMessageButtonProps = {
  messageId: number;
  onScrollToMessage: (messageId: number) => void;
};

const ScrollToMessageButton = memo(
  ({ messageId, onScrollToMessage }: TScrollToMessageButtonProps) => {
    const handleClick = useCallback(
      () => onScrollToMessage(messageId),
      [onScrollToMessage, messageId]
    );

    return <IconButton icon={ArrowRight} size="xs" onClick={handleClick} />;
  }
);

const PinnedMessageGroupWrapper = memo(
  ({ message, onScrollToMessage }: TPinnedMessageGroupWrapperProps) => {
    const { t } = useTranslation();
    const group = useMemo(() => [message], [message]);
    const user = useUserById(message.pinnedBy ?? 0);
    const pinnedDate = message.pinnedAt ? new Date(message.pinnedAt) : null;

    return (
      <div
        className="rounded-lg border border-border/70 bg-card/60 p-2"
        data-testid={TestId.PINNED_MESSAGE}
      >
        <div className="mb-2 flex items-center justify-between rounded-md border border-border/50 bg-secondary/35 px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Pin className="h-3.5 w-3.5 text-primary/80" />
            <span>
              {t('pinnedBy', { name: user ? user.name : t('unknownUser') })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {pinnedDate ? (
              <RelativeTime date={pinnedDate}>
                {(relativeTime) => (
                  <span
                    className="text-xs text-muted-foreground"
                    title={format(pinnedDate, 'PPpp')}
                  >
                    {relativeTime}
                  </span>
                )}
              </RelativeTime>
            ) : (
              <span className="text-xs text-muted-foreground">
                {t('unknownTime')}
              </span>
            )}
            <Tooltip content={t('scrollToMessage')}>
              <ScrollToMessageButton
                messageId={message.id}
                onScrollToMessage={onScrollToMessage}
              />
            </Tooltip>
          </div>
        </div>
        <MessagesGroup
          group={group}
          disableActions
          disableFiles
          disableReactions
        />
      </div>
    );
  }
);

type TPinnedMessagesPopoverProps = {
  channelId: number;
};

// the pins of the channel it is given, never the selected one: a direct message and a call's
// chat are not the selected channel
const PinnedMessagesPopover = memo(
  ({ channelId }: TPinnedMessagesPopoverProps) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [pinnedMessages, setPinnedMessages] = useState<TJoinedMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const channel = useChannelById(channelId);
    const isDm = !!channel?.isDm;

    const togglePinnedMessages = useCallback(() => {
      setIsOpen((prev) => !prev);
    }, []);

    // the conversation showing this channel scrolls to it, wherever it is on screen
    const handleScrollToMessage = useCallback(
      (messageId: number) => {
        setIsOpen(false);
        setMessageJumpTarget({
          channelId,
          messageId,
          isDm,
          highlightTime: 4000
        });
      },
      [channelId, isDm]
    );

    useEffect(() => {
      if (!isOpen) return;

      let isCancelled = false;

      const loadPinnedMessages = async () => {
        setLoading(true);

        const trpc = getTRPCClient();

        try {
          const messages = await trpc.messages.getPinned.query({
            channelId
          });

          if (!isCancelled) {
            setPinnedMessages(messages);
          }
        } catch (error) {
          if (!isCancelled) {
            toast.error(getTrpcError(error, t('failedLoadPinnedMessages')));
          }
        } finally {
          if (!isCancelled) {
            setLoading(false);
          }
        }
      };

      loadPinnedMessages();

      return () => {
        isCancelled = true;
      };
    }, [isOpen, channelId, t]);

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <IconButton
            icon={Pin}
            size="sm"
            variant="ghost"
            onClick={togglePinnedMessages}
            data-testid={TestId.PINNED_MESSAGES_BUTTON}
          />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="bottom"
          collisionPadding={8}
          className="w-[min(30rem,calc(100vw-1rem))] max-h-120 overflow-auto"
        >
          <div className="px-4 py-2 font-semibold">
            {t('pinnedMessagesTitle')}
          </div>
          {loading ? (
            <div className="p-4">
              <Spinner size="xs" />
            </div>
          ) : (
            <div className="p-2">
              {pinnedMessages.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  {t('noPinnedMessages')}
                </div>
              ) : (
                <div className="space-y-2">
                  {pinnedMessages.map((message) => (
                    <PinnedMessageGroupWrapper
                      key={message.id}
                      message={message}
                      onScrollToMessage={handleScrollToMessage}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  }
);

export { PinnedMessagesPopover };
