import { installBrowserStub, setViewport } from '@/__tests__/browser-stub';
import {
  selectedDmChannelIdSelector,
  selectedThreadSelector,
  voiceChatSidebarOpenSelector
} from '@/features/app/selectors';
import type { IRootState } from '@/features/store';
import { ChannelType, type TChannel } from '@sharkord/shared';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test
} from 'bun:test';
import {
  currentVoiceChannelIdSelector,
  selectedChannelIdSelector
} from '../channels/selectors';
import {
  activeFullscreenPluginIdSelector,
  isMobileContentOpenSelector,
  lastServerChannelIdSelector,
  mobileContentClosingSelector
} from '../selectors';
import {
  serverSliceActions,
  serverSliceReducer,
  type IServerState
} from '../slice';

const GENERAL_ID = 3;
const OFF_TOPIC_ID = 4;
const VOICE_ID = 7;
const DM_CHANNEL_ID = 20;
const PARENT_MESSAGE_ID = 40;

// closeMobileContent's MOBILE_LIST_SLIDE_MS
const LIST_SLIDE_MS = 260;

const PHONE_WIDTH = 390;
const DESKTOP_WIDTH = 1280;

const initialState = serverSliceReducer(undefined, { type: '@@init' });

const reduce = (
  state: IServerState,
  ...actions: Parameters<typeof serverSliceReducer>[1][]
) => actions.reduce((next, action) => serverSliceReducer(next, action), state);

const asRoot = (server: IServerState) => ({ server }) as unknown as IRootState;

describe('leaving the server for the DMs', () => {
  test('should remember the channel that was open and close it', () => {
    const state = reduce(
      initialState,
      serverSliceActions.setSelectedChannelId(GENERAL_ID),
      serverSliceActions.setDmsOpen(true)
    );

    expect(state.selectedChannelId).toBeUndefined();
    expect(lastServerChannelIdSelector(asRoot(state))).toBe(GENERAL_ID);
  });

  test('should remember a call that was selected the same way', () => {
    const state = reduce(
      initialState,
      serverSliceActions.setSelectedChannelId(VOICE_ID),
      serverSliceActions.setDmsOpen(true)
    );

    expect(lastServerChannelIdSelector(asRoot(state))).toBe(VOICE_ID);
  });

  // opening the DMs again from inside them has no channel to remember, and must not forget
  // the one from before
  test('should keep the remembered channel when nothing is selected', () => {
    const state = reduce(
      initialState,
      serverSliceActions.setSelectedChannelId(GENERAL_ID),
      serverSliceActions.setDmsOpen(true),
      serverSliceActions.setDmsOpen(false),
      serverSliceActions.setDmsOpen(true)
    );

    expect(lastServerChannelIdSelector(asRoot(state))).toBe(GENERAL_ID);
  });

  test('should forget the remembered channel when the server state resets', () => {
    const state = reduce(
      initialState,
      serverSliceActions.setSelectedChannelId(GENERAL_ID),
      serverSliceActions.setDmsOpen(true),
      serverSliceActions.resetState()
    );

    expect(lastServerChannelIdSelector(asRoot(state))).toBeUndefined();
  });
});

describe('closing the open conversation on a phone', () => {
  test('should mark the conversation as closing until it is cleared', () => {
    const state = reduce(
      initialState,
      serverSliceActions.setSelectedChannelId(GENERAL_ID),
      serverSliceActions.setMobileContentClosing(true)
    );

    expect(mobileContentClosingSelector(asRoot(state))).toBe(true);
    expect(state.selectedChannelId).toBe(GENERAL_ID);
  });

  // a channel picked while the list slides back in has to stay open
  test('should stop closing when a channel is opened', () => {
    const state = reduce(
      initialState,
      serverSliceActions.setSelectedChannelId(GENERAL_ID),
      serverSliceActions.setMobileContentClosing(true),
      serverSliceActions.setSelectedChannelId(VOICE_ID)
    );

    expect(mobileContentClosingSelector(asRoot(state))).toBe(false);
  });

  test('should stop closing when a full screen plugin is opened', () => {
    const state = reduce(
      initialState,
      serverSliceActions.setSelectedChannelId(GENERAL_ID),
      serverSliceActions.setMobileContentClosing(true),
      serverSliceActions.setActiveFullscreenPluginId('board')
    );

    expect(mobileContentClosingSelector(asRoot(state))).toBe(false);
  });

  test('should keep closing while the channel is cleared', () => {
    const state = reduce(
      initialState,
      serverSliceActions.setSelectedChannelId(GENERAL_ID),
      serverSliceActions.setMobileContentClosing(true),
      serverSliceActions.setSelectedChannelId(undefined)
    );

    expect(mobileContentClosingSelector(asRoot(state))).toBe(true);
  });

  test('should not be closing after the server state resets', () => {
    const state = reduce(
      initialState,
      serverSliceActions.setMobileContentClosing(true),
      serverSliceActions.resetState()
    );

    expect(mobileContentClosingSelector(asRoot(state))).toBe(false);
  });
});

let store: (typeof import('@/features/store'))['store'];
let appSliceActions: (typeof import('@/features/app/slice'))['appSliceActions'];
let serverActions: typeof import('../actions');
let appActions: typeof import('@/features/app/actions');
let threadsActions: typeof import('../threads/actions');
let uninstallBrowserStub: () => void;

const channel = (id: number, type: ChannelType) =>
  ({
    id,
    categoryId: 1,
    position: id,
    name: `channel-${id}`,
    type,
    private: false
  }) as TChannel;

const resetStore = () => {
  store.dispatch(serverSliceActions.resetState());
  appActions.resetApp();
  appActions.setSelectedDmChannelId(undefined);
};

const openChannel = (channelId: number) =>
  store.dispatch(serverSliceActions.setSelectedChannelId(channelId));

// the actions read the store, and the app slice reads the layout when it loads, so they load
// once the browser stand in is there
beforeAll(async () => {
  uninstallBrowserStub = installBrowserStub();

  ({ store } = await import('@/features/store'));
  ({ appSliceActions } = await import('@/features/app/slice'));
  serverActions = await import('../actions');
  appActions = await import('@/features/app/actions');
  threadsActions = await import('../threads/actions');
});

afterAll(() => {
  resetStore();
  uninstallBrowserStub();
});

describe('setDmsOpen', () => {
  beforeEach(() => {
    resetStore();
    setViewport({ width: DESKTOP_WIDTH });

    store.dispatch(
      serverSliceActions.addChannel(channel(GENERAL_ID, ChannelType.TEXT))
    );
    store.dispatch(
      serverSliceActions.addChannel(channel(VOICE_ID, ChannelType.VOICE))
    );
  });

  test('should open the channel from before the DMs again on the way out', () => {
    openChannel(GENERAL_ID);
    serverActions.setDmsOpen(true);
    serverActions.setDmsOpen(false);

    expect(selectedChannelIdSelector(store.getState())).toBe(GENERAL_ID);
  });

  test('should select a call from before the DMs again without joining it', () => {
    openChannel(VOICE_ID);
    serverActions.setDmsOpen(true);
    serverActions.setDmsOpen(false);

    const state = store.getState();

    expect(selectedChannelIdSelector(state)).toBe(VOICE_ID);
    expect(currentVoiceChannelIdSelector(state)).toBeUndefined();
  });

  // back lands on the list on a phone, and a channel opening over it would hide it
  test('should leave the list showing on a phone', () => {
    setViewport({ width: PHONE_WIDTH });

    openChannel(GENERAL_ID);
    serverActions.setDmsOpen(true);
    serverActions.setDmsOpen(false);

    expect(selectedChannelIdSelector(store.getState())).toBeUndefined();
  });

  test('should not open a channel deleted while the DMs were open', () => {
    openChannel(GENERAL_ID);
    serverActions.setDmsOpen(true);
    store.dispatch(serverSliceActions.removeChannel({ channelId: GENERAL_ID }));
    serverActions.setDmsOpen(false);

    expect(selectedChannelIdSelector(store.getState())).toBeUndefined();
  });

  // the server view closes the DMs whenever the server turns them off, open or not
  test('should leave the open channel alone when the DMs were not open', () => {
    openChannel(GENERAL_ID);
    serverActions.setDmsOpen(true);
    serverActions.setDmsOpen(false);
    openChannel(VOICE_ID);
    serverActions.setDmsOpen(false);

    expect(selectedChannelIdSelector(store.getState())).toBe(VOICE_ID);
  });
});

describe('closeMobileContent', () => {
  beforeEach(() => {
    resetStore();
    setViewport({ width: PHONE_WIDTH });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('should close the conversation straight away from md up', () => {
    setViewport({ width: DESKTOP_WIDTH });

    openChannel(GENERAL_ID);
    serverActions.closeMobileContent();

    const state = store.getState();

    expect(selectedChannelIdSelector(state)).toBeUndefined();
    expect(mobileContentClosingSelector(state)).toBe(false);
  });

  test('should slide the list over the conversation before closing it', () => {
    openChannel(GENERAL_ID);
    serverActions.closeMobileContent();

    const sliding = store.getState();

    expect(isMobileContentOpenSelector(sliding)).toBe(false);
    expect(selectedChannelIdSelector(sliding)).toBe(GENERAL_ID);

    jest.advanceTimersByTime(LIST_SLIDE_MS);

    const closed = store.getState();

    expect(selectedChannelIdSelector(closed)).toBeUndefined();
    expect(mobileContentClosingSelector(closed)).toBe(false);
  });

  test('should keep a channel opened while the list slides in', () => {
    openChannel(GENERAL_ID);
    serverActions.closeMobileContent();
    jest.advanceTimersByTime(120);
    openChannel(OFF_TOPIC_ID);
    jest.advanceTimersByTime(LIST_SLIDE_MS);

    const state = store.getState();

    expect(selectedChannelIdSelector(state)).toBe(OFF_TOPIC_ID);
    expect(isMobileContentOpenSelector(state)).toBe(true);
  });

  // the first back's timer used to fire 60ms into the second slide and close the channel
  // opened in between, blanking it under the moving list
  test('should close a channel opened mid slide only when its own slide ends', () => {
    openChannel(GENERAL_ID);
    serverActions.closeMobileContent();
    jest.advanceTimersByTime(120);
    openChannel(OFF_TOPIC_ID);
    jest.advanceTimersByTime(80);
    serverActions.closeMobileContent();
    jest.advanceTimersByTime(61);

    expect(selectedChannelIdSelector(store.getState())).toBe(OFF_TOPIC_ID);

    jest.advanceTimersByTime(LIST_SLIDE_MS - 61);

    expect(selectedChannelIdSelector(store.getState())).toBeUndefined();
  });

  test('should close a full screen plugin', () => {
    serverActions.setActiveFullscreenPluginId('board');
    serverActions.closeMobileContent();
    jest.advanceTimersByTime(LIST_SLIDE_MS);

    expect(activeFullscreenPluginIdSelector(store.getState())).toBeUndefined();
  });

  // the thread's channel is what turning the threads off uncovers, so it stays open
  test('should close the thread back left when the threads are turned off mid slide', () => {
    openChannel(GENERAL_ID);
    appActions.openThread(PARENT_MESSAGE_ID, GENERAL_ID);
    serverActions.closeMobileContent();
    jest.advanceTimersByTime(120);
    threadsActions.setThreadsOpen(false);
    jest.advanceTimersByTime(LIST_SLIDE_MS);

    const state = store.getState();

    expect(selectedThreadSelector(state)).toBeUndefined();
    expect(selectedChannelIdSelector(state)).toBe(GENERAL_ID);
  });

  // a DM left open would come straight back the next time the DMs are opened
  test('should close the DM back left when the DMs are turned off mid slide', () => {
    serverActions.setDmsOpen(true);
    appActions.setSelectedDmChannelId(DM_CHANNEL_ID);
    serverActions.closeMobileContent();
    jest.advanceTimersByTime(120);
    serverActions.setDmsOpen(false);
    jest.advanceTimersByTime(LIST_SLIDE_MS);

    expect(selectedDmChannelIdSelector(store.getState())).toBeUndefined();
  });

  test('should keep a DM picked while the list slides in', () => {
    serverActions.setDmsOpen(true);
    appActions.setSelectedDmChannelId(DM_CHANNEL_ID);
    serverActions.closeMobileContent();
    jest.advanceTimersByTime(120);
    appActions.setSelectedDmChannelId(DM_CHANNEL_ID);
    jest.advanceTimersByTime(LIST_SLIDE_MS);

    expect(selectedDmChannelIdSelector(store.getState())).toBe(DM_CHANNEL_ID);
  });

  test('should start a call opened again on the call, not on its chat', () => {
    openChannel(VOICE_ID);
    store.dispatch(appSliceActions.setVoiceChatSidebarOpen(true));
    serverActions.closeMobileContent();
    jest.advanceTimersByTime(LIST_SLIDE_MS);

    expect(voiceChatSidebarOpenSelector(store.getState())).toBe(false);
  });
});
