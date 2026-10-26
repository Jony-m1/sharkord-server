import { installBrowserStub } from '@/__tests__/browser-stub';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'bun:test';
import { membersDrawerOpenSelector } from '../selectors';

let store: (typeof import('@/features/store'))['store'];
let appActions: typeof import('../actions');
let uninstallBrowserStub: () => void;

// the actions read the store, and the app slice reads the layout when it loads, so they load
// once the browser stand in is there
beforeAll(async () => {
  uninstallBrowserStub = installBrowserStub();

  ({ store } = await import('@/features/store'));
  appActions = await import('../actions');
});

afterAll(() => {
  appActions.resetApp();
  uninstallBrowserStub();
});

describe('members drawer', () => {
  beforeEach(() => {
    appActions.setMembersDrawerOpen(false);
  });

  test('should open a closed drawer and close an open one', () => {
    appActions.toggleMembersDrawer();

    expect(membersDrawerOpenSelector(store.getState())).toBe(true);

    appActions.toggleMembersDrawer();

    expect(membersDrawerOpenSelector(store.getState())).toBe(false);
  });

  // a kick, a dropped connection or a logout brings the server view back on its channel list,
  // and the drawer left open from before covered it
  test('should close when the app resets on a disconnect', () => {
    appActions.setMembersDrawerOpen(true);
    appActions.resetApp();

    expect(membersDrawerOpenSelector(store.getState())).toBe(false);
  });
});
