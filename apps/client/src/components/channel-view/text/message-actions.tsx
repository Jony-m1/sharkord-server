import { EmojiPicker } from '@/components/emoji-picker';
import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { Protect } from '@/components/protect';
import { useIsShiftHeld } from '@/features/app/hooks';
import { Permission, PluginSlot, TestId } from '@sharkord/shared';
import { IconButton } from '@sharkord/ui';
import {
  MessageSquareText,
  Pencil,
  Pin,
  PinOff,
  Reply,
  Smile,
  Trash,
  Trash2
} from 'lucide-react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMessageActionHandlers } from './hooks/use-message-action-handlers';
import { useQuickReactionEmojis } from './hooks/use-quick-reaction-emojis';
import { QuickReactionButton } from './quick-reaction-button';

const MAX_QUICK_EMOJIS = 4;

type TMessageActionsProps = {
  messageId: number;
  channelId: number;
  onEdit: () => void;
  onReply?: () => void;
  canManage: boolean;
  editable: boolean;
  isThreadReply?: boolean;
  isPinned?: boolean;
  disablePin?: boolean;
};

const MessageActions = memo(
  ({
    onEdit,
    messageId,
    channelId,
    canManage,
    editable,
    isThreadReply,
    isPinned,
    disablePin,
    onReply
  }: TMessageActionsProps) => {
    const { t } = useTranslation();
    const recentEmojisToShow = useQuickReactionEmojis(MAX_QUICK_EMOJIS);
    const isShiftHeld = useIsShiftHeld();
    const { onDelete, onToggleReaction, onReplyInThread, onTogglePin } =
      useMessageActionHandlers({ messageId, channelId });

    const pluginProps = useMemo(
      () => ({ messageId, channelId }),
      [messageId, channelId]
    );

    return (
      <div className="gap-1 absolute right-0 -top-6 z-10 hidden group-hover:flex [&:has([data-state=open])]:flex items-center space-x-1 rounded-lg shadow-lg border border-border p-2 transition-all bg-background">
        {onReply && (
          <IconButton
            size="sm"
            variant="ghost"
            icon={Reply}
            onClick={onReply}
            title={t('replyToMessage')}
          />
        )}
        {!isThreadReply && (
          <IconButton
            size="sm"
            variant="ghost"
            icon={MessageSquareText}
            onClick={onReplyInThread}
            title={t('replyInThread')}
            data-testid={TestId.MESSAGE_REPLY_IN_THREAD}
          />
        )}
        {canManage && (
          <>
            <IconButton
              size="sm"
              variant="ghost"
              icon={Pencil}
              onClick={onEdit}
              disabled={!editable}
              title={t('editMessage')}
            />

            <IconButton
              size="sm"
              variant="ghost"
              icon={isShiftHeld ? Trash2 : Trash}
              className={isShiftHeld ? 'text-destructive' : ''}
              onClick={onDelete}
              title={t('deleteMessageTitle')}
              data-testid={TestId.MESSAGE_DELETE}
            />
          </>
        )}
        {!disablePin && (
          <Protect permission={Permission.PIN_MESSAGES}>
            <IconButton
              size="sm"
              variant="ghost"
              icon={isPinned ? PinOff : Pin}
              onClick={onTogglePin}
              title={isPinned ? t('unpinMessage') : t('pinMessage')}
              data-testid={TestId.MESSAGE_PIN}
            />
          </Protect>
        )}

        <PluginSlotRenderer
          slotId={PluginSlot.MESSAGE_ACTIONS}
          props={pluginProps}
        />

        <Protect permission={Permission.REACT_TO_MESSAGES}>
          <div className="flex items-center space-x-0.5 border-l pl-1 gap-1">
            {recentEmojisToShow.map((emoji) => (
              <QuickReactionButton
                key={emoji.name}
                emoji={emoji}
                onSelect={onToggleReaction}
              />
            ))}

            <EmojiPicker onEmojiSelect={onToggleReaction}>
              <IconButton
                variant="ghost"
                icon={Smile}
                title={t('addReaction')}
              />
            </EmojiPicker>
          </div>
        </Protect>
      </div>
    );
  }
);

export { MessageActions };
