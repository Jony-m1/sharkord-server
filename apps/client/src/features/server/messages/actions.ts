import { openThreadSidebar } from '@/features/app/actions';
import {
  browserNotificationsForDmsSelector,
  browserNotificationsForMentionsSelector,
  browserNotificationsForRepliesSelector,
  browserNotificationsSelector,
  isChannelMutedSelector,
  selectedThreadSelector,
  threadSidebarDataSelector
} from '@/features/app/selectors';
import { appSliceActions } from '@/features/app/slice';
import { store } from '@/features/store';
import { getFileUrl } from '@/helpers/get-file-url';
import { playSound } from '@/helpers/sounds';
import type { TConversation } from '@/types';
import {
  FileCategory,
  getFileCategory,
  getPlainTextFromHtml,
  hasMention,
  TYPING_MS,
  type TJoinedMessage,
  type TThreadSummary
} from '@sharkord/shared';
import { jumpToMessage, markChannelAsRead } from '../actions';
import {
  channelByIdSelector,
  isChannelTextVisibleByIdSelector
} from '../channels/selectors';
import { setDirectMessageActivity } from '../dms/actions';
import { getConversationKey, getMessageConversation } from '../helpers';
import { pluginMetadataByIdSelector } from '../plugins/selectors';
import { isThreadOpenSelector } from '../selectors';
import { serverSliceActions } from '../slice';
import { isThreadFollowedSelector } from '../threads/selectors';
import { SoundType } from '../types';
import {
  ownUserIdSelector,
  ownUserRoleIdsSelector,
  userByIdSelector
} from '../users/selectors';
import { shouldSendMessageNotification } from './helpers';

const sendBrowserNotification = (
  message: TJoinedMessage,
  channelId: number,
  isDm = false
) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const state = store.getState();

  const user = userByIdSelector(state, message.userId);
  const plugin = pluginMetadataByIdSelector(state, message.pluginId);
  const channel = channelByIdSelector(state, channelId);
  const isPluginMessage = !!message.pluginId;

  if (!user || !channel) {
    return;
  }

  const authorName = isPluginMessage && plugin ? plugin.name : user.name;
  const textContent = getPlainTextFromHtml(message.content ?? '');

  const title = isDm
    ? `${authorName} (DM)`
    : `${authorName} in #${channel?.name ?? 'unknown'}`;

  const imageFile = message.files?.find(
    (file) => getFileCategory(file.extension) === FileCategory.IMAGE
  );

  let body = 'Sent an attachment';

  if (textContent) {
    body = textContent;
  } else if (imageFile) {
    body = 'Sent an image';
  }

  const icon = user?.avatar ? getFileUrl(user.avatar) : undefined;
  // a preview of the picture where the platform shows one; not in the dom typings yet
  const image = imageFile ? getFileUrl(imageFile) : undefined;

  const notification = new Notification(title, {
    body,
    icon,
    image
  } as NotificationOptions);

  notification.onclick = () => {
    window.focus();

    const { parentMessageId } = message;

    jumpToMessage({
      channelId,
      messageId: message.id,
      parentMessageId: parentMessageId ?? undefined,
      isDm
    });

    // a thread reply lives in its thread, which jumpToMessage does not open
    if (parentMessageId) {
      openThreadSidebar(parentMessageId, channelId);
    }

    notification.close();
  };
};

const typingTimeouts: { [key: string]: NodeJS.Timeout } = {};

export const setConversationMessages = (
  conversation: TConversation,
  messages: TJoinedMessage[],
  detached: boolean
) => {
  store.dispatch(
    serverSliceActions.setConversationMessages({
      conversationKey: getConversationKey(conversation),
      messages,
      detached
    })
  );
};

export const trimConversationMessages = (conversation: TConversation) => {
  store.dispatch(
    serverSliceActions.trimConversationMessages(
      getConversationKey(conversation)
    )
  );
};

// every message passed belongs to the conversation, a page or a single live message
export const addMessages = (
  conversation: TConversation,
  messages: TJoinedMessage[],
  isSubscriptionMessage = false
) => {
  const { channelId } = conversation;

  store.dispatch(
    serverSliceActions.addMessages({
      conversationKey: getConversationKey(conversation),
      messages,
      isLive: isSubscriptionMessage
    })
  );

  messages.forEach((message) => {
    if (message.userId) {
      removeTypingUser(conversation, message.userId);
    }
  });

  if (isSubscriptionMessage && messages.length > 0) {
    const state = store.getState();
    const ownUserId = ownUserIdSelector(state);
    const hasBrowserNotificationsEnabled = browserNotificationsSelector(state);
    const notificationsForMentionsOnly =
      browserNotificationsForMentionsSelector(state);
    const targetMessage = messages[0];
    const isFromOwnUser =
      targetMessage.userId && ownUserId === targetMessage.userId;

    const isChannelTextVisible = isChannelTextVisibleByIdSelector(
      state,
      channelId
    );

    // a window that is open but behind other windows is not hidden, only unfocused
    const isWindowHidden = document.hidden || !document.hasFocus();
    const isChannelMuted = isChannelMutedSelector(state, channelId);
    const channel = channelByIdSelector(state, channelId);
    const isDmChannel = !!channel?.isDm;

    if (isDmChannel) {
      setDirectMessageActivity(channelId, targetMessage.createdAt);
    }
    const ownRoleIds = ownUserRoleIdsSelector(state);

    const threadParentId = targetMessage.parentMessageId;
    const isThreadReply = !!threadParentId;
    const isThreadOpen =
      !!threadParentId && isThreadOpenSelector(state, threadParentId);
    const isFollowedThread =
      !!threadParentId && isThreadFollowedSelector(state, threadParentId);
    const isMentioned = hasMention(
      targetMessage.content ?? null,
      ownUserId,
      ownRoleIds
    );

    // replies in threads the user does not follow stay quiet. a mention counts on its own,
    // in case the reply lands before the event that makes the user follow its thread
    const isNotifiable = !isThreadReply || isFollowedThread || isMentioned;

    // a thread reply is only on screen while its thread is open, seeing the channel is not enough
    const isMessageOnScreen =
      (isThreadReply ? isThreadOpen : isChannelTextVisible) && !isWindowHidden;

    if (!isFromOwnUser && !isChannelMuted) {
      if (isNotifiable || isThreadOpen) {
        playSound(SoundType.MESSAGE_RECEIVED);
      }

      if (isNotifiable && !isMessageOnScreen) {
        const shouldNotify = shouldSendMessageNotification({
          isDm: isDmChannel,
          isMentioned,
          isReplyToOwnMessage:
            !!targetMessage.replyToMessageId &&
            targetMessage.replyTo?.userId === ownUserId,
          allMessages: hasBrowserNotificationsEnabled,
          mentionsOnly: notificationsForMentionsOnly,
          dms: browserNotificationsForDmsSelector(state),
          replies: browserNotificationsForRepliesSelector(state)
        });

        if (shouldNotify) {
          sendBrowserNotification(targetMessage, channelId, isDmChannel);
        }
      }
    }

    if (isChannelTextVisible && !isFromOwnUser && !isThreadReply) {
      markChannelAsRead(channelId, true);
    }
  }
};

export const updateMessage = (message: TJoinedMessage) => {
  store.dispatch(
    serverSliceActions.updateMessage({
      conversationKey: getConversationKey(getMessageConversation(message)),
      message
    })
  );
};

export const deleteMessage = (
  conversation: TConversation,
  messageId: number
) => {
  store.dispatch(serverSliceActions.deleteMessage({ conversation, messageId }));

  const state = store.getState();
  const threadSidebar = threadSidebarDataSelector(state);
  const selectedThread = selectedThreadSelector(state);

  if (threadSidebar.parentMessageId === messageId) {
    store.dispatch(
      appSliceActions.setThreadSidebarOpen({
        open: false,
        parentMessageId: undefined,
        channelId: undefined
      })
    );
  }

  if (selectedThread?.parentMessageId === messageId) {
    store.dispatch(appSliceActions.setSelectedThread(undefined));
  }
};

export const removeTypingUser = (
  conversation: TConversation,
  userId: number
) => {
  store.dispatch(
    serverSliceActions.removeTypingUser({
      conversationKey: getConversationKey(conversation),
      userId
    })
  );
};

export const addTypingUser = (conversation: TConversation, userId: number) => {
  const conversationKey = getConversationKey(conversation);
  const timeoutKey = `${conversationKey}-${userId}`;

  store.dispatch(serverSliceActions.addTypingUser({ conversationKey, userId }));

  if (typingTimeouts[timeoutKey]) {
    clearTimeout(typingTimeouts[timeoutKey]);
  }

  typingTimeouts[timeoutKey] = setTimeout(() => {
    removeTypingUser(conversation, userId);

    delete typingTimeouts[timeoutKey];
  }, TYPING_MS + 500);
};

export const updateThreadSummary = (
  channelId: number,
  messageId: number,
  summary: TThreadSummary
) => {
  store.dispatch(
    serverSliceActions.updateThreadSummary({
      channelId,
      messageId,
      ...summary
    })
  );
};
