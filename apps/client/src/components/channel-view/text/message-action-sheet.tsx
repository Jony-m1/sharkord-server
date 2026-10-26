import { EmojiPickerPanel } from '@/components/emoji-picker/picker-panel';
import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { Protect } from '@/components/protect';
import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import { useReferenceableChannels } from '@/features/server/hooks';
import { cn } from '@/lib/utils';
import {
  MessageNodeType,
  Permission,
  PluginSlot,
  TestId,
  type TJoinedMessage
} from '@sharkord/shared';
import { IconButton, Sheet, SheetContent, SheetTitle } from '@sharkord/ui';
import {
  Copy,
  MessageSquareText,
  Pencil,
  Pin,
  PinOff,
  Reply,
  Smile,
  Trash,
  type LucideIcon
} from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useMessageActionHandlers } from './hooks/use-message-action-handlers';
import { useQuickReactionEmojis } from './hooks/use-quick-reaction-emojis';
import { QuickReactionButton } from './quick-reaction-button';

// as many as fit beside the add button on a 360px wide phone
const MAX_QUICK_EMOJIS = 5;

// the message as it was written, for the clipboard: entities decoded, emoji kept as their
// characters and a line per paragraph, all of which the shared plain text helper drops for
// previews. a channel reference is stored without its name, which its chip looks up, and a
// custom emoji is a picture, so both are written out as they are typed
const getMessageText = (
  html: string,
  getChannelLabel: (channelId: number) => string
) => {
  const withLineBreaks = html.replace(/<br\s*\/?>|<\/p>/gi, '$&\n');
  const parser = new DOMParser();
  const parsed = parser.parseFromString(withLineBreaks, 'text/html');
  const { body } = parsed;

  const channelReferences = body.querySelectorAll<HTMLElement>(
    `span[data-type="${MessageNodeType.CHANNEL_REFERENCE}"]`
  );

  for (const reference of channelReferences) {
    const channelId = Number(reference.dataset.channelId);

    reference.textContent = `#${getChannelLabel(channelId)}`;
  }

  const emojis = body.querySelectorAll<HTMLElement>(
    `span[data-type="${MessageNodeType.EMOJI}"]`
  );

  for (const emoji of emojis) {
    const isCustom = emoji.querySelector('img') !== null;

    if (isCustom) {
      emoji.textContent = `:${emoji.dataset.name}:`;
    }
  }

  const text = body.textContent ?? '';

  return text.trim();
};

// the sheet closes with nothing to hand focus back to, and moving it would steal it from what
// the action opened, such as the edit box
const keepFocus = (event: Event) => {
  event.preventDefault();
};

type TSheetRowProps = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  testId: TestId;
  disabled?: boolean;
  destructive?: boolean;
};

const SheetRow = memo(
  ({
    icon: Icon,
    label,
    onClick,
    testId,
    disabled,
    destructive
  }: TSheetRowProps) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={cn(
        'flex w-full items-center gap-4 rounded-md px-3 py-3 text-left text-base active:bg-accent disabled:opacity-50',
        destructive && 'text-destructive'
      )}
    >
      <Icon className="size-5 shrink-0" />
      <span>{label}</span>
    </button>
  )
);

type TMessageActionSheetContentProps = {
  message: TJoinedMessage;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onReply?: () => void;
};

// mounted only while the sheet is open, so a message that is never long pressed runs none of this
const MessageActionSheetContent = memo(
  ({
    message,
    canManage,
    onClose,
    onEdit,
    onReply
  }: TMessageActionSheetContentProps) => {
    const { t } = useTranslation();
    const [isPickingEmoji, setIsPickingEmoji] = useState(false);
    const quickEmojis = useQuickReactionEmojis(MAX_QUICK_EMOJIS);
    const { id: messageId, channelId } = message;
    const { onDelete, onToggleReaction, onReplyInThread, onTogglePin } =
      useMessageActionHandlers({ messageId, channelId });

    const isThreadReply = !!message.parentMessageId;
    const isPinned = message.pinned ?? false;
    const editable = message.editable ?? false;

    const referenceableChannels = useReferenceableChannels();

    // the name the reader sees on the chip, which a channel they cannot see does not show
    const text = useMemo(() => {
      const channelNames = new Map(
        referenceableChannels.map(({ id, name }) => [id, name])
      );

      const getChannelLabel = (channelId: number) =>
        channelNames.get(channelId) ?? t('unknownChannel');

      return getMessageText(message.content ?? '', getChannelLabel);
    }, [message.content, referenceableChannels, t]);

    const pluginProps = useMemo(
      () => ({ messageId, channelId }),
      [messageId, channelId]
    );

    const handleReaction = useCallback(
      async (emoji: TEmojiItem) => {
        onClose();
        await onToggleReaction(emoji);
      },
      [onClose, onToggleReaction]
    );

    const showEmojiPicker = useCallback(() => setIsPickingEmoji(true), []);

    const handleReply = useCallback(() => {
      onClose();
      onReply?.();
    }, [onClose, onReply]);

    const handleReplyInThread = useCallback(() => {
      onClose();
      onReplyInThread();
    }, [onClose, onReplyInThread]);

    const handleEdit = useCallback(() => {
      onClose();
      onEdit();
    }, [onClose, onEdit]);

    const handleTogglePin = useCallback(async () => {
      onClose();
      await onTogglePin();
    }, [onClose, onTogglePin]);

    const handleDelete = useCallback(async () => {
      onClose();
      await onDelete();
    }, [onClose, onDelete]);

    // the clipboard only takes a write inside the tap that asked for it, so this runs before
    // anything else is awaited
    const handleCopy = useCallback(async () => {
      onClose();

      try {
        await navigator.clipboard.writeText(text);
        toast.success(t('messageTextCopied'));
      } catch {
        toast.error(t('failedCopyMessageText'));
      }
    }, [onClose, text, t]);

    // the top padding keeps the search field clear of the sheet's close button
    if (isPickingEmoji) {
      return (
        <div
          className="flex h-110 flex-col pt-10"
          data-testid={TestId.MESSAGE_SHEET_EMOJI_PICKER}
        >
          <div className="min-h-0 flex-1">
            <EmojiPickerPanel onEmojiSelect={handleReaction} />
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Protect permission={Permission.REACT_TO_MESSAGES}>
          <div className="flex items-center gap-2 pr-10">
            {quickEmojis.map((emoji) => (
              <QuickReactionButton
                key={emoji.name}
                emoji={emoji}
                onSelect={handleReaction}
                className="size-11 rounded-full bg-secondary text-2xl"
                imageClassName="size-7"
                testId={TestId.MESSAGE_SHEET_REACTION}
              />
            ))}
            <IconButton
              icon={Smile}
              variant="ghost"
              onClick={showEmojiPicker}
              title={t('addReaction')}
              className="size-11 rounded-full bg-secondary"
              data-testid={TestId.MESSAGE_SHEET_ADD_REACTION}
            />
          </div>
        </Protect>

        <div className="flex flex-col">
          {onReply && (
            <SheetRow
              icon={Reply}
              label={t('replyToMessage')}
              onClick={handleReply}
              testId={TestId.MESSAGE_SHEET_REPLY}
            />
          )}
          {!isThreadReply && (
            <SheetRow
              icon={MessageSquareText}
              label={t('replyInThread')}
              onClick={handleReplyInThread}
              testId={TestId.MESSAGE_SHEET_THREAD}
            />
          )}
          {canManage && (
            <SheetRow
              icon={Pencil}
              label={t('editMessage')}
              onClick={handleEdit}
              disabled={!editable}
              testId={TestId.MESSAGE_SHEET_EDIT}
            />
          )}
          {!isThreadReply && (
            <Protect permission={Permission.PIN_MESSAGES}>
              <SheetRow
                icon={isPinned ? PinOff : Pin}
                label={isPinned ? t('unpinMessage') : t('pinMessage')}
                onClick={handleTogglePin}
                testId={TestId.MESSAGE_SHEET_PIN}
              />
            </Protect>
          )}
          {text && (
            <SheetRow
              icon={Copy}
              label={t('copyMessageText')}
              onClick={handleCopy}
              testId={TestId.MESSAGE_SHEET_COPY}
            />
          )}
          {canManage && (
            <SheetRow
              icon={Trash}
              label={t('deleteMessageTitle')}
              onClick={handleDelete}
              destructive
              testId={TestId.MESSAGE_SHEET_DELETE}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 empty:hidden">
          <PluginSlotRenderer
            slotId={PluginSlot.MESSAGE_ACTIONS}
            props={pluginProps}
          />
        </div>
      </div>
    );
  }
);

type TMessageActionSheetProps = Omit<
  TMessageActionSheetContentProps,
  'onClose'
> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// for screen readers; inside the sheet's content, so only an open sheet translates it
const MessageActionSheetTitle = memo(() => {
  const { t } = useTranslation();

  return <SheetTitle className="sr-only">{t('messageActions')}</SheetTitle>;
});

// what a long press on a message opens on a touch screen, where the hover toolbar never shows.
// every message renders one, so this outer part holds no hooks beyond the close callback
const MessageActionSheet = memo(
  ({ open, onOpenChange, ...contentProps }: TMessageActionSheetProps) => {
    const close = useCallback(() => onOpenChange(false), [onOpenChange]);

    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          close={close}
          aria-describedby={undefined}
          onCloseAutoFocus={keepFocus}
          data-testid={TestId.MESSAGE_ACTION_SHEET}
          className="mx-auto max-h-[85dvh] max-w-lg gap-0 overflow-y-auto rounded-t-xl"
        >
          <MessageActionSheetTitle />
          <MessageActionSheetContent {...contentProps} onClose={close} />
        </SheetContent>
      </Sheet>
    );
  }
);

export { MessageActionSheet };
