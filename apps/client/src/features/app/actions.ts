import { assertNotificationsPermission } from '@/helpers/assert-notifications-permission';
import { getFileUrl, getUrlFromServer } from '@/helpers/get-file-url';
import { isWideLayout } from '@/helpers/is-wide-layout';
import {
  LocalStorageKey,
  setLocalStorageItem,
  setLocalStorageItemAsJSON,
  setLocalStorageItemBool
} from '@/helpers/storage';
import { i18n } from '@/i18n';
import {
  MicMode,
  type TMessageJumpToTarget,
  type TThreadTarget
} from '@/types';
import type { TServerInfo } from '@sharkord/shared';
import { toast } from 'sonner';
import { markChannelAsRead, setInfo } from '../server/actions';
import { visibleVoiceChatChannelIdSelector } from '../server/channels/selectors';
import { isThreadOverConversationSelector } from '../server/selectors';
import { serverSliceActions } from '../server/slice';
import { setThreadsOpen } from '../server/threads/actions';
import { store } from '../store';
import {
  membersDrawerOpenSelector,
  mutedChannelIdsSelector,
  pluginSlotDebugSelector,
  voiceChatSidebarOpenSelector
} from './selectors';
import { appSliceActions } from './slice';

export const setAppLoading = (loading: boolean) =>
  store.dispatch(appSliceActions.setAppLoading(loading));

export const setIsAutoConnecting = (isAutoConnecting: boolean) =>
  store.dispatch(appSliceActions.setIsAutoConnecting(isAutoConnecting));

export const setPluginsLoading = (loading: boolean) =>
  store.dispatch(appSliceActions.setLoadingPlugins(loading));

const setOrCreateMeta = (name: string, content: string) => {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);

  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }

  el.content = content;
};

const setOrCreateLink = (rel: string, href: string) => {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);

  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }

  el.href = href;
};

const applyServerBranding = (info: TServerInfo) => {
  document.title = info.name;

  const logoUrl = info.logo
    ? getFileUrl(info.logo)
    : `${getUrlFromServer()}/favicon.ico`;

  setOrCreateLink('icon', logoUrl);
  setOrCreateLink('apple-touch-icon', logoUrl);
  setOrCreateMeta('apple-mobile-web-app-title', info.name);
};

export const fetchServerInfo = async (): Promise<TServerInfo | undefined> => {
  try {
    const url = getUrlFromServer();
    const response = await fetch(`${url}/info`);

    if (!response.ok) {
      throw new Error('Failed to fetch server info');
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.error('Error fetching server info:', error);
  }
};

export const loadApp = async () => {
  const info = await fetchServerInfo();

  if (!info) {
    console.error('Failed to load server info during app load');
    toast.error(i18n.t('common:failedLoadServerInfo'));
    return;
  }

  setInfo(info);
  applyServerBranding(info);
  setAppLoading(false);
};

export const setModViewOpen = (isOpen: boolean, userId?: number) =>
  store.dispatch(
    appSliceActions.setModViewOpen({
      modViewOpen: isOpen,
      userId
    })
  );

export const openThreadSidebar = (parentMessageId: number, channelId: number) =>
  store.dispatch(
    appSliceActions.setThreadSidebarOpen({
      open: true,
      parentMessageId,
      channelId
    })
  );

export const closeThreadSidebar = () =>
  store.dispatch(
    appSliceActions.setThreadSidebarOpen({
      open: false,
      parentMessageId: undefined,
      channelId: undefined
    })
  );

export const resetApp = () => {
  store.dispatch(
    appSliceActions.setModViewOpen({
      modViewOpen: false,
      userId: undefined
    })
  );
  store.dispatch(
    appSliceActions.setThreadSidebarOpen({
      open: false,
      parentMessageId: undefined,
      channelId: undefined
    })
  );
  store.dispatch(appSliceActions.setSelectedThread(undefined));
  // the server view comes back on its channel list, which an open drawer would cover
  store.dispatch(appSliceActions.setMembersDrawerOpen(false));
};

export const setAutoJoinLastChannel = (autoJoin: boolean) => {
  store.dispatch(appSliceActions.setAutoJoinLastChannel(autoJoin));

  setLocalStorageItemBool(LocalStorageKey.AUTO_JOIN_LAST_CHANNEL, autoJoin);
};

export const setMicMode = (micMode: MicMode) => {
  store.dispatch(appSliceActions.setMicMode(micMode));

  setLocalStorageItem(LocalStorageKey.MIC_MODE, micMode);
};

export const setHotkeysEnabled = (enabled: boolean) => {
  store.dispatch(appSliceActions.setHotkeysEnabled(enabled));

  setLocalStorageItemBool(LocalStorageKey.HOTKEYS_ENABLED, enabled);

  if (!enabled) {
    setMicMode(MicMode.OPEN);
  }
};

// on a phone, a thread or a DM picked while back slides the list in stays open, as a channel
// picked then does (the server slice resets the flag for those)
const cancelMobileContentClosing = () =>
  store.dispatch(serverSliceActions.setMobileContentClosing(false));

export const setSelectedThread = (thread: TThreadTarget | undefined) => {
  store.dispatch(appSliceActions.setSelectedThread(thread));

  if (thread) {
    cancelMobileContentClosing();
    closeThreadSidebar();
  }
};

// the thread sidebar is a column that only shows from tailwind's lg breakpoint up; below that a
// thread opens full screen in the threads view, the way picking one from the threads list does
export const openThread = (parentMessageId: number, channelId: number) => {
  if (isWideLayout()) {
    openThreadSidebar(parentMessageId, channelId);

    return;
  }

  setThreadsOpen(true);
  setSelectedThread({ parentMessageId, channelId });
  store.dispatch(appSliceActions.setSelectedThreadFromConversation(true));
};

// the thread's close button, and back from a thread on a phone
export const closeSelectedThread = () => {
  const state = store.getState();

  // the threads go first, so the threads list never shows in between
  if (isThreadOverConversationSelector(state)) {
    setThreadsOpen(false);
  }

  setSelectedThread(undefined);
};

export const setSelectedDmChannelId = (channelId: number | undefined) => {
  store.dispatch(appSliceActions.setSelectedDmChannelId(channelId));

  if (channelId !== undefined) {
    cancelMobileContentClosing();
    markChannelAsRead(channelId);
  }
};

export const setBrowserNotifications = async (enabled: boolean) => {
  if (enabled) {
    await assertNotificationsPermission();
  }

  store.dispatch(appSliceActions.setBrowserNotifications(enabled));
  setLocalStorageItemBool(LocalStorageKey.BROWSER_NOTIFICATIONS, enabled);
};

export const setBrowserNotificationsForMentions = async (enabled: boolean) => {
  if (enabled) {
    await assertNotificationsPermission();
  }

  store.dispatch(appSliceActions.setBrowserNotificationsForMentions(enabled));
  setLocalStorageItemBool(
    LocalStorageKey.BROWSER_NOTIFICATIONS_FOR_MENTIONS,
    enabled
  );
};

export const setBrowserNotificationsForDms = async (enabled: boolean) => {
  if (enabled) {
    await assertNotificationsPermission();
  }

  store.dispatch(appSliceActions.setBrowserNotificationsForDms(enabled));
  setLocalStorageItemBool(
    LocalStorageKey.BROWSER_NOTIFICATIONS_FOR_DMS,
    enabled
  );
};

export const setBrowserNotificationsForReplies = async (enabled: boolean) => {
  if (enabled) {
    await assertNotificationsPermission();
  }

  store.dispatch(appSliceActions.setBrowserNotificationsForReplies(enabled));
  setLocalStorageItemBool(
    LocalStorageKey.BROWSER_NOTIFICATIONS_FOR_REPLIES,
    enabled
  );
};

export const setNotificationSounds = (enabled: boolean) => {
  store.dispatch(appSliceActions.setNotificationSounds(enabled));
  setLocalStorageItemBool(LocalStorageKey.NOTIFICATION_SOUNDS, enabled);
};

export const setMessageSentSound = (enabled: boolean) => {
  store.dispatch(appSliceActions.setMessageSentSound(enabled));
  setLocalStorageItemBool(LocalStorageKey.MESSAGE_SENT_SOUND, enabled);
};

export const toggleChannelMuted = (channelId: number) => {
  const mutedChannelIds = mutedChannelIdsSelector(store.getState());
  const nextMutedChannelIds = mutedChannelIds.includes(channelId)
    ? mutedChannelIds.filter((id) => id !== channelId)
    : [...mutedChannelIds, channelId];

  store.dispatch(appSliceActions.setMutedChannelIds(nextMutedChannelIds));
  setLocalStorageItemAsJSON(
    LocalStorageKey.MUTED_CHANNEL_IDS,
    nextMutedChannelIds
  );
};

export const setMessageJumpTarget = (
  payload: TMessageJumpToTarget | undefined
) => store.dispatch(appSliceActions.setMessageJumpTarget(payload));

const setVoiceChatSidebarOpen = (open: boolean) => {
  store.dispatch(appSliceActions.setVoiceChatSidebarOpen(open));
  setLocalStorageItemBool(LocalStorageKey.VOICE_CHAT_SIDEBAR_STATE, open);
};

export const openVoiceChatSidebar = () => {
  setVoiceChatSidebarOpen(true);

  const visibleVoiceChatChannelId = visibleVoiceChatChannelIdSelector(
    store.getState()
  );

  if (visibleVoiceChatChannelId) {
    markChannelAsRead(visibleVoiceChatChannelId);
  }
};

export const closeVoiceChatSidebar = () => setVoiceChatSidebarOpen(false);

export const toggleVoiceChatSidebar = () => {
  const isOpen = voiceChatSidebarOpenSelector(store.getState());

  if (isOpen) {
    closeVoiceChatSidebar();
  } else {
    openVoiceChatSidebar();
  }
};

// below lg the members are a drawer over the conversation, from lg up a column the top bar
// toggles, so the two are separate states
export const setMembersDrawerOpen = (open: boolean) =>
  store.dispatch(appSliceActions.setMembersDrawerOpen(open));

export const toggleMembersDrawer = () => {
  const isOpen = membersDrawerOpenSelector(store.getState());

  setMembersDrawerOpen(!isOpen);
};

export const togglePluginSlotDebug = () => {
  const state = store.getState();
  const current = pluginSlotDebugSelector(state);
  const next = !current;

  store.dispatch(appSliceActions.setPluginSlotDebug(next));
  setLocalStorageItemBool(LocalStorageKey.PLUGIN_SLOT_DEBUG, next);
};

export const setModifierKeysHeldMap = (keysDown: Record<string, boolean>) => {
  store.dispatch(appSliceActions.setModifierKeysHeldMap(keysDown));
};
