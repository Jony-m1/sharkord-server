import { Dialog } from '@/components/dialogs/dialogs';
import { logDebug } from '@/helpers/browser-logger';
import { getHostFromServer } from '@/helpers/get-file-url';
import { isPhoneLayout } from '@/helpers/is-phone-layout';
import { playSound } from '@/helpers/sounds';
import { pushVoiceDebugEvent } from '@/helpers/voice-debug';
import { i18n } from '@/i18n';
import { cleanup, connectToTRPC, getTRPCClient } from '@/lib/trpc';
import type { TMessageJumpToTarget } from '@/types';
import {
  ChannelType,
  type TLocale,
  type TPublicServerSettings,
  type TServerInfo
} from '@sharkord/shared';
import { TRPCClientError } from '@trpc/client';
import { toast } from 'sonner';
import { appSliceActions } from '../app/slice';
import { openDialog } from '../dialogs/actions';
import { store, type IRootState } from '../store';
import { setSelectedChannelId } from './channels/actions';
import {
  channelByIdSelector,
  channelReadStateByIdSelector,
  currentVoiceChannelIdSelector,
  isChannelTextVisibleByIdSelector
} from './channels/selectors';
import {
  processPluginComponents,
  setPluginCapabilityAccess,
  setPluginCommands,
  setPluginComponents
} from './plugins/actions';
import {
  activeFullscreenPluginIdSelector,
  connectedSelector,
  dmsOpenSelector,
  infoSelector,
  isMobileContentOpenSelector,
  lastServerChannelIdSelector,
  mobileContentClosingSelector
} from './selectors';
import { serverSliceActions } from './slice';
import { threadsOpenSelector } from './threads/selectors';
import { SoundType, type TDisconnectInfo } from './types';

let unsubscribeFromServer: (() => void) | null = null;

export const setConnected = (status: boolean) => {
  store.dispatch(serverSliceActions.setConnected(status));
};

export const resetServerState = () => {
  store.dispatch(serverSliceActions.resetState());
};

export const setDisconnectInfo = (info: TDisconnectInfo | undefined) => {
  store.dispatch(serverSliceActions.setDisconnectInfo(info));
};

// leaving the DMs goes back to the channel that was open before them, as on Discord, selected
// but not joined when it is a call. on a phone the list is the screen back lands on, so nothing
// opens over it there
export const setDmsOpen = (open: boolean) => {
  const state = store.getState();
  const wasOpen = dmsOpenSelector(state);
  const lastServerChannelId = lastServerChannelIdSelector(state);

  store.dispatch(serverSliceActions.setDmsOpen(open));

  if (
    open ||
    !wasOpen ||
    lastServerChannelId === undefined ||
    isPhoneLayout()
  ) {
    return;
  }

  const lastServerChannel = channelByIdSelector(state, lastServerChannelId);

  if (!lastServerChannel) return;

  setSelectedChannelId(lastServerChannelId);
};

export const setPublicServerSettings = (
  settings: TPublicServerSettings | undefined
) => {
  store.dispatch(serverSliceActions.setPublicSettings(settings));
};

export const setInfo = (info: TServerInfo | undefined) => {
  store.dispatch(serverSliceActions.setInfo(info));
};

export const setActiveFullscreenPluginId = (pluginId: string | undefined) => {
  store.dispatch(serverSliceActions.setActiveFullscreenPluginId(pluginId));
};

// the action that closes whatever is open in the list that is showing, so tapping it again opens
// it again
const getClearMobileContentAction = (state: IRootState) => {
  if (activeFullscreenPluginIdSelector(state)) {
    return serverSliceActions.setActiveFullscreenPluginId(undefined);
  }

  if (threadsOpenSelector(state)) {
    return appSliceActions.setSelectedThread(undefined);
  }

  if (dmsOpenSelector(state)) {
    return appSliceActions.setSelectedDmChannelId(undefined);
  }

  return serverSliceActions.setSelectedChannelId(undefined);
};

type TClearMobileContentAction = ReturnType<typeof getClearMobileContentAction>;

// how long the list takes to slide back over the conversation, its duration-[260ms] in the
// server view
const MOBILE_LIST_SLIDE_MS = 260;

let mobileContentCloseTimer: ReturnType<typeof setTimeout> | undefined;

const finishClosingMobileContent = (clearAction: TClearMobileContentAction) => {
  mobileContentCloseTimer = undefined;

  const state = store.getState();

  // opening something while the list slid back cancelled the close
  if (!mobileContentClosingSelector(state)) return;

  store.dispatch(clearAction);
  store.dispatch(serverSliceActions.setMobileContentClosing(false));
  // a call opened again from the list starts on the call, not on its chat, as on Discord. a
  // phone never reads the saved state back, so it is not saved here
  store.dispatch(appSliceActions.setVoiceChatSidebarOpen(false));
};

// back from the open conversation to the list on a phone (isMobileContentOpenSelector). the list
// slides back over the conversation first and the conversation closes once it is covered, so
// it does not blank out under the moving list. a timer rather than transitionend, because a
// transition that never runs (reduced motion, a hidden page) would leave it open for good
export const closeMobileContent = () => {
  const state = store.getState();

  if (!isMobileContentOpenSelector(state)) return;

  // what back closes is decided when it is pressed: turning the threads or the DMs off while
  // the list slides in must not move the close onto the server channel under them
  const clearAction = getClearMobileContentAction(state);

  if (!isPhoneLayout()) {
    store.dispatch(clearAction);

    return;
  }

  // a back can only follow another one once something was opened in between, which left the
  // earlier timer running; it would close the new conversation part way through this slide
  clearTimeout(mobileContentCloseTimer);

  store.dispatch(serverSliceActions.setMobileContentClosing(true));
  mobileContentCloseTimer = setTimeout(
    () => finishClosingMobileContent(clearAction),
    MOBILE_LIST_SLIDE_MS
  );
};

export const connect = async () => {
  const state = store.getState();
  const info = infoSelector(state);

  if (!info) {
    throw new Error('Failed to fetch server info');
  }

  const { serverId } = info;

  const host = getHostFromServer();
  const trpc = await connectToTRPC(host);

  const { hasPassword, handshakeHash } = await trpc.others.handshake.query();

  if (hasPassword) {
    // show password prompt
    openDialog(Dialog.SERVER_PASSWORD, { handshakeHash, serverId });
    return;
  }

  const { showWelcomeDialog } = await joinServer(handshakeHash);

  if (showWelcomeDialog) {
    openDialog(Dialog.WELCOME_PROFILE_SETUP);
  }
};

export const joinServer = async (handshakeHash: string, password?: string) => {
  const trpc = getTRPCClient();
  const data = await trpc.others.joinServer.query({
    handshakeHash,
    password,
    locale: i18n.resolvedLanguage as TLocale
  });

  logDebug('joinServer', data);

  const { initSubscriptions } = await import('./subscriptions');

  try {
    unsubscribeFromServer?.();
  } catch (error) {
    logDebug('failed to unsubscribe stale subscriptions', error);
  }

  unsubscribeFromServer = initSubscriptions();

  store.dispatch(serverSliceActions.setInitialData(data));

  setPluginCommands(data.commands);
  setPluginCapabilityAccess(data.pluginCapabilityAccess);

  const components = await processPluginComponents(
    data.pluginIdsWithComponents
  );

  setPluginComponents(components);

  return {
    showWelcomeDialog: data.showWelcomeDialog
  };
};

export const disconnectFromServer = () => {
  cleanup();
  unsubscribeFromServer?.();
};

const RECONNECT_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 8_000];

let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDisconnectInfo: TDisconnectInfo | undefined;

export const cancelReconnect = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  reconnectAttempt = 0;
  reconnectDisconnectInfo = undefined;
};

const abandonReconnect = () => {
  const info = reconnectDisconnectInfo;

  cleanup();
  setDisconnectInfo(info);
  playSound(SoundType.SERVER_DISCONNECTED);
};

// a reconnected socket starts unauthenticated: the server only sets ctx.authenticated and
// tracks the user in joinServer, and every subscription sits behind that. so recovering a
// dropped connection means replaying the whole join, not just reopening the transport.
export const reconnectToServer = (info: TDisconnectInfo) => {
  if (reconnectTimer) return;

  const state = store.getState();

  if (reconnectAttempt === 0 && !connectedSelector(state)) {
    setConnected(false);
    cleanup();

    return;
  }

  setConnected(false);

  reconnectDisconnectInfo = info;

  const delay = RECONNECT_DELAYS_MS[reconnectAttempt];

  if (delay === undefined) {
    abandonReconnect();
    return;
  }

  reconnectAttempt += 1;

  pushVoiceDebugEvent('ws', 'reconnect scheduled', {
    attempt: reconnectAttempt,
    delay,
    code: info.code,
    reason: info.reason
  });

  store.dispatch(
    serverSliceActions.setReconnect({
      attempt: reconnectAttempt,
      maxAttempts: RECONNECT_DELAYS_MS.length,
      nextAttemptAt: Date.now() + delay
    })
  );

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;

    store.dispatch(
      serverSliceActions.setReconnect({
        attempt: reconnectAttempt,
        maxAttempts: RECONNECT_DELAYS_MS.length,
        nextAttemptAt: null
      })
    );

    try {
      // connect() opens the password dialog instead of joining when the server asks for one,
      // so reconnecting stays true until setInitialData clears it
      await connect();
      cancelReconnect();

      pushVoiceDebugEvent('ws', 'reconnected', {
        voiceChannelId: currentVoiceChannelIdSelector(store.getState())
      });
    } catch (error) {
      logDebug('reconnect attempt failed', error);

      pushVoiceDebugEvent('error', 'reconnect attempt failed', {
        error: String(error)
      });

      const isAuthFailure =
        error instanceof TRPCClientError &&
        (error.data?.code === 'UNAUTHORIZED' ||
          error.data?.code === 'FORBIDDEN');

      if (isAuthFailure) {
        abandonReconnect();
        return;
      }

      reconnectToServer(info);
    }
  }, delay);
};

export const jumpToMessage = (target: TMessageJumpToTarget) => {
  store.dispatch(appSliceActions.setMessageJumpTarget(target));

  if (target.isDm) {
    setDmsOpen(true);
    store.dispatch(appSliceActions.setSelectedDmChannelId(target.channelId));

    return;
  }

  // not setDmsOpen, which would select the channel from before the DMs on the way out
  store.dispatch(serverSliceActions.setDmsOpen(false));
  store.dispatch(appSliceActions.setSelectedDmChannelId(undefined));
  store.dispatch(serverSliceActions.setSelectedChannelId(target.channelId));

  const state = store.getState();
  const channel = channelByIdSelector(state, target.channelId);

  // a call's messages are in its chat, which starts closed on a phone, so the jump opens it
  if (channel?.type === ChannelType.VOICE && !target.parentMessageId) {
    store.dispatch(appSliceActions.setVoiceChatSidebarOpen(true));
  }

  const nextState = store.getState();

  if (isChannelTextVisibleByIdSelector(nextState, target.channelId)) {
    markChannelAsRead(target.channelId);
  }
};

export const markChannelAsRead = async (
  channelId: number,
  force: boolean = false
) => {
  const state = store.getState();
  const unreadCount = channelReadStateByIdSelector(state, channelId);

  if (!force && unreadCount === 0) {
    return;
  }

  if (unreadCount > 0) {
    store.dispatch(
      serverSliceActions.setChannelReadState({ channelId, count: 0 })
    );
  }

  try {
    const trpc = getTRPCClient();

    await trpc.channels.markAsRead.mutate({ channelId });
  } catch {
    if (unreadCount > 0) {
      store.dispatch(
        serverSliceActions.setChannelReadState({
          channelId,
          count: unreadCount
        })
      );
    }
  }
};

window.useToken = async (token: string) => {
  const trpc = getTRPCClient();

  try {
    await trpc.others.useSecretToken.mutate({ token });

    toast.success(i18n.t('common:nowServerOwner'));
  } catch {
    toast.error(i18n.t('common:invalidAccessToken'));
  }
};

window.sharkordDebug = {
  ...window.sharkordDebug,
  openSoundsModal: () => openDialog(Dialog.SOUNDS)
};
