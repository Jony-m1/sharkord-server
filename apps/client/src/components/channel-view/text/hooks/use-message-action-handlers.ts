import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import { openThread } from '@/features/app/actions';
import { useIsShiftHeld } from '@/features/app/hooks';
import { requestConfirmation } from '@/features/dialogs/actions';
import { getTRPCClient } from '@/lib/trpc';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TUseMessageActionHandlersProps = {
  messageId: number;
  channelId: number;
};

// what a message's actions do, shared by the hover toolbar and the long press sheet on touch
// screens so the two cannot drift apart
export const useMessageActionHandlers = ({
  messageId,
  channelId
}: TUseMessageActionHandlersProps) => {
  const { t } = useTranslation();
  const isShiftHeld = useIsShiftHeld();

  const onDelete = useCallback(async () => {
    if (!isShiftHeld) {
      const choice = await requestConfirmation({
        title: t('deleteMessageTitle'),
        message: t('deleteMessageConfirm'),
        confirmLabel: t('deleteLabel'),
        cancelLabel: t('cancel')
      });

      if (!choice) return;
    }

    const trpc = getTRPCClient();

    try {
      await trpc.messages.delete.mutate({ messageId });
      toast.success(t('messageDeleted'));
    } catch {
      toast.error(t('failedDeleteMessage'));
    }
  }, [isShiftHeld, messageId, t]);

  const onToggleReaction = useCallback(
    async (emoji: TEmojiItem) => {
      const trpc = getTRPCClient();

      try {
        await trpc.messages.toggleReaction.mutate({
          messageId,
          emoji: emoji.shortcodes[0]
        });
      } catch (error) {
        toast.error(t('failedAddReaction'));

        console.error('Error adding reaction:', error);
      }
    },
    [messageId, t]
  );

  const onReplyInThread = useCallback(() => {
    openThread(messageId, channelId);
  }, [messageId, channelId]);

  const onTogglePin = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.messages.togglePin.mutate({ messageId });

      toast.success(t('messagePinToggled'));
    } catch (error) {
      toast.error(t('failedTogglePin'));

      console.error('Error toggling pin status:', error);
    }
  }, [messageId, t]);

  return useMemo(
    () => ({ onDelete, onToggleReaction, onReplyInThread, onTogglePin }),
    [onDelete, onToggleReaction, onReplyInThread, onTogglePin]
  );
};
