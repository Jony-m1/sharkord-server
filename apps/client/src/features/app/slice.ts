import { isCallChatScreenLayout } from '@/helpers/call-chat-layout';
import {
  getLocalStorageItem,
  getLocalStorageItemAsJSON,
  getLocalStorageItemBool,
  LocalStorageKey
} from '@/helpers/storage';
import {
  MicMode,
  type TDevices,
  type TMessageJumpToTarget,
  type TThreadTarget
} from '@/types';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface TAppState {
  appLoading: boolean;
  isAutoConnecting: boolean;
  loadingPlugins: boolean;
  devices: TDevices | undefined;
  modViewOpen: boolean;
  modViewUserId: number | undefined;
  threadSidebarOpen: boolean;
  threadParentMessageId: number | undefined;
  threadChannelId: number | undefined;
  autoJoinLastChannel: boolean;
  micMode: MicMode;
  hotkeysEnabled: boolean;
  selectedDmChannelId: number | undefined;
  selectedThread: TThreadTarget | undefined;
  selectedThreadFromConversation: boolean;
  browserNotifications: boolean;
  browserNotificationsForMentions: boolean;
  browserNotificationsForDms: boolean;
  browserNotificationsForReplies: boolean;
  notificationSounds: boolean;
  messageSentSound: boolean;
  mutedChannelIds: number[];
  messageJumpTarget: TMessageJumpToTarget | undefined;
  voiceChatSidebarOpen: boolean;
  membersDrawerOpen: boolean;
  pluginSlotDebug: boolean;
  modifierKeysHeldMap: Record<string, boolean>;
}

const initialState: TAppState = {
  appLoading: true,
  isAutoConnecting: false,
  loadingPlugins: true,
  devices: undefined,
  modViewOpen: false,
  modViewUserId: undefined,
  threadSidebarOpen: false,
  threadParentMessageId: undefined,
  threadChannelId: undefined,
  autoJoinLastChannel: getLocalStorageItemBool(
    LocalStorageKey.AUTO_JOIN_LAST_CHANNEL,
    false
  ),
  micMode:
    getLocalStorageItem(LocalStorageKey.MIC_MODE) === MicMode.PUSH_TO_TALK
      ? MicMode.PUSH_TO_TALK
      : MicMode.OPEN,
  hotkeysEnabled: getLocalStorageItemBool(
    LocalStorageKey.HOTKEYS_ENABLED,
    false
  ),
  selectedDmChannelId: undefined,
  selectedThread: undefined,
  selectedThreadFromConversation: false,
  browserNotifications: getLocalStorageItemBool(
    LocalStorageKey.BROWSER_NOTIFICATIONS,
    false
  ),
  browserNotificationsForMentions: getLocalStorageItemBool(
    LocalStorageKey.BROWSER_NOTIFICATIONS_FOR_MENTIONS,
    false
  ),
  browserNotificationsForDms: getLocalStorageItemBool(
    LocalStorageKey.BROWSER_NOTIFICATIONS_FOR_DMS,
    false
  ),
  browserNotificationsForReplies: getLocalStorageItemBool(
    LocalStorageKey.BROWSER_NOTIFICATIONS_FOR_REPLIES,
    false
  ),
  notificationSounds: getLocalStorageItemBool(
    LocalStorageKey.NOTIFICATION_SOUNDS,
    true
  ),
  messageSentSound: getLocalStorageItemBool(
    LocalStorageKey.MESSAGE_SENT_SOUND,
    true
  ),
  mutedChannelIds:
    getLocalStorageItemAsJSON<number[]>(LocalStorageKey.MUTED_CHANNEL_IDS) ??
    [],
  messageJumpTarget: undefined,
  // a call's chat sits under the call where both fit, so it starts open there. elsewhere, a
  // phone either way up, it is a screen of its own over the call, so the app starts on the call
  // whatever was saved
  voiceChatSidebarOpen:
    !isCallChatScreenLayout() &&
    getLocalStorageItemBool(LocalStorageKey.VOICE_CHAT_SIDEBAR_STATE, true),
  membersDrawerOpen: false,
  pluginSlotDebug: getLocalStorageItemBool(
    LocalStorageKey.PLUGIN_SLOT_DEBUG,
    false
  ),
  modifierKeysHeldMap: { Shift: false, Control: false, Alt: false }
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setAppLoading: (state, action: PayloadAction<boolean>) => {
      state.appLoading = action.payload;
    },
    setDevices: (state, action: PayloadAction<TDevices>) => {
      state.devices = action.payload;
    },
    setLoadingPlugins: (state, action: PayloadAction<boolean>) => {
      state.loadingPlugins = action.payload;
    },
    setModViewOpen: (
      state,
      action: PayloadAction<{
        modViewOpen: boolean;
        userId?: number;
      }>
    ) => {
      state.modViewOpen = action.payload.modViewOpen;

      // closing keeps the user, so the sheet still has its content while it slides out; the
      // next open replaces it, and the content is unmounted once the sheet is closed anyway
      if (action.payload.modViewOpen) {
        state.modViewUserId = action.payload.userId;
      }
    },
    setThreadSidebarOpen: (
      state,
      action: PayloadAction<{
        open: boolean;
        parentMessageId?: number;
        channelId?: number;
      }>
    ) => {
      state.threadSidebarOpen = action.payload.open;
      state.threadParentMessageId = action.payload.parentMessageId;
      state.threadChannelId = action.payload.channelId;
    },
    setAutoJoinLastChannel: (state, action: PayloadAction<boolean>) => {
      state.autoJoinLastChannel = action.payload;
    },
    setMicMode: (state, action: PayloadAction<MicMode>) => {
      state.micMode = action.payload;
    },
    setHotkeysEnabled: (state, action: PayloadAction<boolean>) => {
      state.hotkeysEnabled = action.payload;
    },
    setIsAutoConnecting: (state, action: PayloadAction<boolean>) => {
      state.isAutoConnecting = action.payload;
    },
    setSelectedDmChannelId: (
      state,
      action: PayloadAction<number | undefined>
    ) => {
      state.selectedDmChannelId = action.payload;
    },
    setSelectedThread: (
      state,
      action: PayloadAction<TThreadTarget | undefined>
    ) => {
      state.selectedThread = action.payload;
      // only openThread marks a thread as opened from a conversation, and anything that picks
      // or clears one after it, the threads list or back, ends that
      state.selectedThreadFromConversation = false;
    },
    setSelectedThreadFromConversation: (
      state,
      action: PayloadAction<boolean>
    ) => {
      state.selectedThreadFromConversation = action.payload;
    },
    setBrowserNotifications: (state, action: PayloadAction<boolean>) => {
      state.browserNotifications = action.payload;
    },
    setBrowserNotificationsForMentions: (
      state,
      action: PayloadAction<boolean>
    ) => {
      state.browserNotificationsForMentions = action.payload;
    },
    setBrowserNotificationsForDms: (state, action: PayloadAction<boolean>) => {
      state.browserNotificationsForDms = action.payload;
    },
    setBrowserNotificationsForReplies: (
      state,
      action: PayloadAction<boolean>
    ) => {
      state.browserNotificationsForReplies = action.payload;
    },
    setNotificationSounds: (state, action: PayloadAction<boolean>) => {
      state.notificationSounds = action.payload;
    },
    setMessageSentSound: (state, action: PayloadAction<boolean>) => {
      state.messageSentSound = action.payload;
    },
    setMutedChannelIds: (state, action: PayloadAction<number[]>) => {
      state.mutedChannelIds = action.payload;
    },
    setMessageJumpTarget: (
      state,
      action: PayloadAction<TMessageJumpToTarget | undefined>
    ) => {
      state.messageJumpTarget = action.payload;
    },
    setVoiceChatSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.voiceChatSidebarOpen = action.payload;
    },
    setMembersDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.membersDrawerOpen = action.payload;
    },
    setPluginSlotDebug: (state, action: PayloadAction<boolean>) => {
      state.pluginSlotDebug = action.payload;
    },
    setModifierKeysHeldMap: (
      state,
      action: PayloadAction<Record<string, boolean>>
    ) => {
      state.modifierKeysHeldMap = action.payload;
    }
  }
});

const appSliceActions = appSlice.actions;
const appSliceReducer = appSlice.reducer;

export { appSliceActions, appSliceReducer };
