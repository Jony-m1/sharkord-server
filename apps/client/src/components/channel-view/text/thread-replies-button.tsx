import { ThreadRepliesSummary } from '@/components/thread-replies-summary';
import { UnreadCount } from '@/components/unread-count';
import { openThread } from '@/features/app/actions';
import { useThreadReadState } from '@/features/server/threads/hooks';
import { TestId, type TThreadSummary } from '@sharkord/shared';
import { memo, useCallback } from 'react';

type TThreadRepliesButtonProps = TThreadSummary & {
  messageId: number;
  channelId: number;
};

const ThreadRepliesButton = memo(
  ({
    messageId,
    channelId,
    replyCount,
    replyUserIds
  }: TThreadRepliesButtonProps) => {
    const { unreadCount, hasUnreadMention } = useThreadReadState(messageId);

    const onClick = useCallback(() => {
      openThread(messageId, channelId);
    }, [messageId, channelId]);

    return (
      <button
        type="button"
        onClick={onClick}
        data-testid={TestId.THREAD_REPLIES_BUTTON}
        className="flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary hover:underline mt-1 transition-colors"
      >
        <ThreadRepliesSummary
          replyCount={replyCount}
          replyUserIds={replyUserIds}
        />
        <UnreadCount
          count={unreadCount}
          hasMention={hasUnreadMention}
          className="ml-0 h-4 min-w-4 px-1"
        />
      </button>
    );
  }
);

export { ThreadRepliesButton };
