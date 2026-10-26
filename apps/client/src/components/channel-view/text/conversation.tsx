import { MessageCompose } from '@/components/message-compose';
import { useThreadSidebar } from '@/features/app/hooks';
import { getConversationKey } from '@/features/server/helpers';
import { useChannelCan, useTypingUsers } from '@/features/server/hooks';
import { useConversationMessages } from '@/features/server/messages/hooks';
import { SoundType } from '@/features/server/types';
import { playSound } from '@/helpers/sounds';
import { LocalStorageKey } from '@/helpers/storage';
import { useTypingSignal } from '@/hooks/use-typing-signal';
import { startPendingUpload } from '@/lib/pending-uploads';
import { getTRPCClient } from '@/lib/trpc';
import type { TReplyTarget } from '@/types';
import {
  ChannelPermission,
  getTrpcError,
  prepareMessageHtml,
  TestId,
  type TJoinedMessage
} from '@sharkord/shared';
import { Button, Spinner } from '@sharkord/ui';
import { ArrowDown } from 'lucide-react';
import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ChatInputDivider } from './chat-input-divider';
import { DEFAULT_MAX_HEIGHT_VH } from './helpers';
import { useArrowUpEdit } from './hooks/use-arrow-up-edit';
import { useScrollController } from './hooks/use-scroll-controller';
import { useScrollToJumpTarget } from './hooks/use-scroll-to-jump-target';
import { MessagesGroup } from './messages-group';
import { PendingUploads } from './pending-uploads';
import { TextNoAccess } from './text-no-access';
import { TextSkeleton } from './text-skeleton';
import {
  getConversationDraftKey,
  getDraftMessage,
  setDraftMessage
} from './use-draft-messages';

type TConversationProps = {
  channelId: number;
  parentMessageId?: number;
  renderHeader: (
    scrollToMessage: (messageId: number) => Promise<void>
  ) => ReactNode;
  emptyState?: ReactNode;
};

const Conversation = memo(
  ({
    channelId,
    parentMessageId,
    renderHeader,
    emptyState
  }: TConversationProps) => {
    const { t } = useTranslation();
    const {
      messages,
      hasMore,
      loadMore,
      loadFailed,
      retryLoad,
      loading,
      refreshing,
      fetchingOlder,
      isEmpty,
      groupedMessages,
      scrollToMessage,
      detachedFromPresent,
      returnToPresent
    } = useConversationMessages(channelId, parentMessageId);

    useScrollToJumpTarget(channelId, parentMessageId, scrollToMessage);

    const isThread = !!parentMessageId;
    const conversationKey = getConversationKey({ channelId, parentMessageId });
    const draftKey = getConversationDraftKey({ channelId, parentMessageId });
    // a thread usually sits in the narrow side panel, so its composer height is kept apart
    const inputStorageKey = isThread
      ? LocalStorageKey.THREAD_INPUT_HEIGHT_VH
      : LocalStorageKey.CHAT_INPUT_HEIGHT_VH;

    const [newMessage, setNewMessage] = useState(getDraftMessage(draftKey));
    const [replyingToMessage, setReplyingToMessage] = useState<
      TJoinedMessage | undefined
    >();
    const typingUsers = useTypingUsers({ channelId, parentMessageId });
    const composeContainerRef = useRef<HTMLDivElement>(null);
    const { activeThreadMessageId } = useThreadSidebar();
    const {
      composeRef,
      editingMessageId,
      handleArrowUpEdit,
      handleEditComplete
    } = useArrowUpEdit(messages);

    const replyTarget = useMemo<TReplyTarget | undefined>(() => {
      if (!replyingToMessage) {
        return undefined;
      }

      if (replyingToMessage.pluginId) {
        return { userId: null, pluginId: replyingToMessage.pluginId };
      }

      return { userId: replyingToMessage.userId, pluginId: null };
    }, [replyingToMessage]);

    const {
      containerRef,
      onScroll,
      onAsyncContentLoaded,
      scrollToBottom,
      isAtBottom,
      loadOlderKeepingPosition
    } = useScrollController({
      messages,
      fetching: refreshing || fetchingOlder,
      // after a failure scrolling asks for nothing, the retry at the top of the list does
      hasMore: hasMore && !loadFailed,
      loadMore,
      hasTypingUsers: typingUsers.length > 0
    });

    const onComposeResize = useCallback(() => {
      if (isAtBottom()) {
        scrollToBottom();
      }
    }, [isAtBottom, scrollToBottom]);

    const channelCan = useChannelCan(channelId);

    const sendTypingSignal = useTypingSignal(channelId, parentMessageId);

    const setNewMessageHandler = useCallback(
      (value: string) => {
        setNewMessage(value);
        setDraftMessage(draftKey, value);
      },
      [setNewMessage, draftKey]
    );

    const sendMessage = useCallback(
      async (
        message: string,
        files: { id: string }[],
        replyToMessageId: number | undefined
      ) => {
        const trpc = getTRPCClient();

        try {
          await trpc.messages.send.mutate({
            content: prepareMessageHtml(message),
            channelId,
            parentMessageId,
            files: files.map((f) => f.id),
            replyToMessageId
          });

          playSound(SoundType.MESSAGE_SENT);
        } catch (error) {
          const fallback = isThread
            ? t('failedSendReply')
            : t('failedSendMessage');

          toast.error(getTrpcError(error, fallback));
          return false;
        }

        return true;
      },
      [channelId, parentMessageId, isThread, t]
    );

    // a message with files clears the box straight away and goes out once they are up, with
    // the upload showing at the foot of the conversation meanwhile (PendingUploads)
    const onSend = useCallback(
      async (message: string, files: File[]) => {
        sendTypingSignal.cancel();

        const replyToMessageId = replyingToMessage?.id;

        if (files.length > 0) {
          // not awaited: it runs until the files are up, and never rejects
          startPendingUpload({
            conversationKey,
            files,
            send: (uploaded) => sendMessage(message, uploaded, replyToMessageId)
          });
        } else {
          const sent = await sendMessage(message, [], replyToMessageId);

          if (!sent) return false;
        }

        setNewMessageHandler('');
        setReplyingToMessage(undefined);

        return true;
      },
      [
        conversationKey,
        sendTypingSignal,
        sendMessage,
        setNewMessageHandler,
        replyingToMessage?.id
      ]
    );

    const onReplyMessageSelect = useCallback((message: TJoinedMessage) => {
      setReplyingToMessage(message);
    }, []);

    const handleReturnToPresent = useCallback(() => {
      returnToPresent();
    }, [returnToPresent]);

    const handleRetryLoad = useCallback(() => {
      loadOlderKeepingPosition(retryLoad);
    }, [loadOlderKeepingPosition, retryLoad]);

    const handleCancelReply = useCallback(
      () => setReplyingToMessage(undefined),
      [setReplyingToMessage]
    );

    if (!channelCan(ChannelPermission.VIEW_CHANNEL)) {
      return <TextNoAccess />;
    }

    // the header and the composer never wait for the history, so only the message area changes
    // when it arrives
    let messagesContent: ReactNode = <TextSkeleton />;

    if (!loading) {
      messagesContent = (
        <>
          {loadFailed && (
            <div
              data-testid={TestId.MESSAGES_LOAD_FAILED}
              className="mb-4 flex items-center justify-center gap-3 text-sm text-muted-foreground"
            >
              <span>{t('failedLoadMessages')}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryLoad}
                disabled={refreshing || fetchingOlder}
              >
                {t('retry')}
              </Button>
            </div>
          )}
          {isEmpty && emptyState}
          <div className="space-y-4">
            {groupedMessages.map((group) => (
              <MessagesGroup
                key={group.key}
                group={group.messages}
                onReplyMessageSelect={onReplyMessageSelect}
                replyTargetMessageId={replyingToMessage?.id}
                activeThreadMessageId={activeThreadMessageId}
                editingMessageId={editingMessageId}
                onEditComplete={handleEditComplete}
              />
            ))}
          </div>
        </>
      );
    }

    return (
      <>
        {renderHeader(scrollToMessage)}

        <div className="relative flex min-h-0 flex-1 flex-col">
          {fetchingOlder && (
            <div
              data-testid={TestId.MESSAGES_FETCHING_OLDER}
              className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center"
            >
              <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border border-border rounded-full px-4 py-2 shadow-lg">
                <Spinner size="xs" />
                <span className="text-sm text-muted-foreground">
                  {t('fetchingOlderMessages')}
                </span>
              </div>
            </div>
          )}

          <div
            ref={containerRef}
            onScroll={onScroll}
            onLoadCapture={onAsyncContentLoaded}
            data-messages-container={conversationKey}
            className="flex-1 overflow-y-auto overflow-x-hidden px-2 pt-2 pb-7"
          >
            {messagesContent}
          </div>
        </div>

        <PendingUploads conversationKey={conversationKey} />

        {detachedFromPresent && (
          <button
            type="button"
            onClick={handleReturnToPresent}
            data-testid={TestId.RETURN_TO_PRESENT}
            className="mx-2 mb-1 flex items-center justify-center gap-2 rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/80 cursor-pointer"
          >
            <ArrowDown className="size-3.5" />
            {t('viewingOlderMessages')}
          </button>
        )}

        <ChatInputDivider
          composeContainerRef={composeContainerRef}
          scrollToBottom={scrollToBottom}
          isAtBottom={isAtBottom}
          storageKey={inputStorageKey}
          defaultMaxHeightVh={DEFAULT_MAX_HEIGHT_VH}
        />

        <MessageCompose
          ref={composeRef}
          composeContainerRef={composeContainerRef}
          channelId={channelId}
          message={newMessage}
          onMessageChange={setNewMessageHandler}
          onSend={onSend}
          onTyping={sendTypingSignal}
          typingUsers={typingUsers}
          showPluginSlot={!isThread}
          isThread={isThread}
          inputStorageKey={inputStorageKey}
          onCancelReply={handleCancelReply}
          replyTarget={replyTarget}
          onArrowUp={handleArrowUpEdit}
          onResize={onComposeResize}
        />
      </>
    );
  }
);

export { Conversation };
