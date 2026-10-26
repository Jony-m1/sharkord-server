import { installBrowserStub, setViewport } from '@/__tests__/browser-stub';
import { selectedChannelIdSelector } from '@/features/server/channels/selectors';
import {
  isMobileContentOpenSelector,
  isThreadOverConversationSelector
} from '@/features/server/selectors';
import { threadsOpenSelector } from '@/features/server/threads/selectors';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'bun:test';
import { selectedThreadSelector } from '../selectors';

const GENERAL_ID = 3;
const OFF_TOPIC_ID = 4;
const PARENT_MESSAGE_ID = 40;
const OTHER_PARENT_MESSAGE_ID = 41;

const PHONE_WIDTH = 390;
// between md and lg the threads list shows beside the thread, so another one can be picked there
const TABLET_WIDTH = 900;

let store: (typeof import('@/features/store'))['store'];
let serverSliceActions: (typeof import('@/features/server/slice'))['serverSliceActions'];
let appActions: typeof import('../actions');
let threadsActions: typeof import('@/features/server/threads/actions');
let uninstallBrowserStub: () => void;

const resetStore = () => {
  store.dispatch(serverSliceActions.resetState());
  appActions.resetApp();
};

const openChannel = (channelId: number) =>
  store.dispatch(serverSliceActions.setSelectedChannelId(channelId));

// the actions read the store, and the app slice reads the layout when it loads, so they load
// once the browser stand in is there
beforeAll(async () => {
  uninstallBrowserStub = installBrowserStub();

  ({ store } = await import('@/features/store'));
  ({ serverSliceActions } = await import('@/features/server/slice'));
  appActions = await import('../actions');
  threadsActions = await import('@/features/server/threads/actions');
});

afterAll(() => {
  resetStore();
  uninstallBrowserStub();
});

describe('closeSelectedThread', () => {
  beforeEach(() => {
    resetStore();
    setViewport({ width: PHONE_WIDTH });
  });

  // below lg a thread opened from a message covers its conversation in the threads view, and
  // closing it used to leave the followed threads list in place of the conversation
  test('should go back to the conversation a thread was opened from', () => {
    openChannel(GENERAL_ID);
    appActions.openThread(PARENT_MESSAGE_ID, GENERAL_ID);
    appActions.closeSelectedThread();

    const state = store.getState();

    expect(threadsOpenSelector(state)).toBe(false);
    expect(selectedThreadSelector(state)).toBeUndefined();
    expect(selectedChannelIdSelector(state)).toBe(GENERAL_ID);
    expect(isMobileContentOpenSelector(state)).toBe(true);
  });

  test('should go back to the threads list from a thread picked there', () => {
    openChannel(GENERAL_ID);
    threadsActions.setThreadsOpen(true);
    appActions.setSelectedThread({
      parentMessageId: PARENT_MESSAGE_ID,
      channelId: GENERAL_ID
    });
    appActions.closeSelectedThread();

    const state = store.getState();

    expect(threadsOpenSelector(state)).toBe(true);
    expect(selectedThreadSelector(state)).toBeUndefined();
  });

  test('should go back to the threads list once another thread is picked there', () => {
    setViewport({ width: TABLET_WIDTH });

    openChannel(GENERAL_ID);
    appActions.openThread(PARENT_MESSAGE_ID, GENERAL_ID);
    appActions.setSelectedThread({
      parentMessageId: OTHER_PARENT_MESSAGE_ID,
      channelId: GENERAL_ID
    });
    appActions.closeSelectedThread();

    expect(threadsOpenSelector(store.getState())).toBe(true);
  });

  // a channel opened from inside the thread, a channel chip say, turns the threads off and
  // leaves the thread selected; back from that channel is not back from the thread
  test('should not count a thread whose threads view was left for a channel', () => {
    openChannel(GENERAL_ID);
    appActions.openThread(PARENT_MESSAGE_ID, GENERAL_ID);
    openChannel(OFF_TOPIC_ID);

    expect(isThreadOverConversationSelector(store.getState())).toBe(false);
  });

  test('should forget where a thread came from once back closed it', () => {
    openChannel(GENERAL_ID);
    appActions.openThread(PARENT_MESSAGE_ID, GENERAL_ID);
    appActions.closeSelectedThread();
    threadsActions.setThreadsOpen(true);

    expect(isThreadOverConversationSelector(store.getState())).toBe(false);
  });
});
