import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

type TSliceModule = typeof import('../slice');

let slice: TSliceModule;

// the slice reads the layout once when it loads, which needs a window to ask
beforeAll(async () => {
  globalThis.window = {
    matchMedia: () => ({ matches: true })
  } as never;

  slice = await import('../slice');
});

afterAll(() => {
  delete (globalThis as { window?: unknown }).window;
});

const openOn = (userId: number) =>
  slice.appSliceActions.setModViewOpen({ modViewOpen: true, userId });

const close = () =>
  slice.appSliceActions.setModViewOpen({ modViewOpen: false });

describe('setModViewOpen', () => {
  test('should open the moderation view on a user', () => {
    const { appSliceReducer } = slice;
    const state = appSliceReducer(undefined, openOn(4));

    expect(state.modViewOpen).toBe(true);
    expect(state.modViewUserId).toBe(4);
  });

  // the sheet slides out with its content still in it; clearing the user on close emptied it
  // for the whole of that animation
  test('should keep the user while it closes', () => {
    const { appSliceReducer } = slice;
    const open = appSliceReducer(undefined, openOn(4));
    const closed = appSliceReducer(open, close());

    expect(closed.modViewOpen).toBe(false);
    expect(closed.modViewUserId).toBe(4);
  });

  test('should switch to the next user it is opened on', () => {
    const { appSliceReducer } = slice;
    const first = appSliceReducer(undefined, openOn(4));
    const closed = appSliceReducer(first, close());
    const second = appSliceReducer(closed, openOn(5));

    expect(second.modViewUserId).toBe(5);
  });
});
