import { useCan } from '@/features/server/hooks';
import {
  useIsOwnUser,
  useOwnUserId,
  useOwnUserRoleIds
} from '@/features/server/users/hooks';
import { useLongPress } from '@/hooks/use-long-press';
import { cn } from '@/lib/utils';
import {
  hasMention,
  Permission,
  TestId,
  type TJoinedMessage
} from '@sharkord/shared';
import { memo, useCallback, useMemo, useState } from 'react';
import { MessageActionSheet } from './message-action-sheet';
import { MessageActions } from './message-actions';
import { MessageEditInline } from './message-edit-inline';
import { MessageRenderer } from './renderer';
import { ThreadRepliesButton } from './thread-replies-button';

// to not trigger re-renders for messages without repliers
const NO_REPLY_USER_IDS: number[] = [];

type TMessageProps = {
  message: TJoinedMessage;
  disableActions?: boolean;
  disableFiles?: boolean;
  disableReactions?: boolean;
  onReplyMessageSelect?: (message: TJoinedMessage) => void;
  isInlineReplyTarget?: boolean;
  isActiveThread?: boolean;
  editingMessageId?: number;
  onEditComplete?: () => void;
};

const Message = memo(
  ({
    message,
    disableActions,
    disableFiles,
    disableReactions,
    onReplyMessageSelect,
    isInlineReplyTarget,
    isActiveThread,
    editingMessageId,
    onEditComplete
  }: TMessageProps) => {
    const [isPencilEditing, setIsPencilEditing] = useState(false);
    const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
    const isEditing = isPencilEditing || editingMessageId === message.id;
    const isFromOwnUser = useIsOwnUser(message.userId);
    const can = useCan();
    const ownUserId = useOwnUserId();
    const ownRoleIds = useOwnUserRoleIds();

    const canManage = useMemo(
      () => can(Permission.MANAGE_MESSAGES) || isFromOwnUser,
      [can, isFromOwnUser]
    );

    const isMentioned = useMemo(
      () => hasMention(message.content, ownUserId, ownRoleIds),
      [message.content, ownUserId, ownRoleIds]
    );

    const isThreadReply = !!message.parentMessageId;
    const replyCount = message.replyCount ?? 0;

    const handleEdit = useCallback(() => setIsPencilEditing(true), []);

    const handleReply = useCallback(
      () => onReplyMessageSelect?.(message),
      [onReplyMessageSelect, message]
    );

    const openActionSheet = useCallback(() => setIsActionSheetOpen(true), []);

    // a touch screen has no hover toolbar, so holding a finger on the message opens its
    // actions instead. the edit box keeps the long press for selecting text
    const canOpenActionSheet = !disableActions && !isEditing;
    const longPressHandlers = useLongPress(
      canOpenActionSheet ? openActionSheet : undefined
    );

    const handleEditBlur = useCallback(() => {
      setIsPencilEditing(false);

      if (editingMessageId === message.id) {
        onEditComplete?.();
      }
    }, [editingMessageId, message.id, onEditComplete]);

    return (
      <div
        className={cn(
          'min-w-0 flex-1 ml-1 relative hover:bg-secondary/50 rounded-md px-1 py-0.5 group',
          isActiveThread && 'bg-primary/10',
          isMentioned && 'border-primary bg-primary/5',
          isInlineReplyTarget && 'ring-1 ring-primary/50 bg-primary/10',
          isActionSheetOpen && 'bg-secondary/50'
        )}
        data-testid={TestId.MESSAGE_ITEM}
        data-message-id={message.id}
        {...longPressHandlers}
      >
        {!isEditing ? (
          <>
            <MessageRenderer
              message={message}
              disableFiles={disableFiles}
              disableReactions={disableReactions}
            />
            {!isThreadReply && replyCount > 0 && (
              <ThreadRepliesButton
                messageId={message.id}
                channelId={message.channelId}
                replyCount={replyCount}
                replyUserIds={message.replyUserIds ?? NO_REPLY_USER_IDS}
              />
            )}
            {!disableActions && (
              <MessageActions
                onEdit={handleEdit}
                canManage={canManage}
                messageId={message.id}
                channelId={message.channelId}
                editable={message.editable ?? false}
                isPinned={message.pinned ?? false}
                disablePin={!!message.parentMessageId}
                isThreadReply={isThreadReply}
                onReply={handleReply}
              />
            )}
          </>
        ) : (
          <MessageEditInline message={message} onBlur={handleEditBlur} />
        )}
        {!disableActions && (
          <MessageActionSheet
            open={isActionSheetOpen}
            onOpenChange={setIsActionSheetOpen}
            message={message}
            canManage={canManage}
            onEdit={handleEdit}
            onReply={handleReply}
          />
        )}
      </div>
    );
  }
);

export { Message };
