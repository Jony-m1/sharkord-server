import type { IRootState } from '@/features/store';
import { describe, expect, test } from 'bun:test';
import { isMobileContentOpenSelector } from '../selectors';

type TView = {
  activeFullscreenPluginId?: string;
  threadsOpen?: boolean;
  selectedThread?: { parentMessageId: number; channelId: number };
  dmsOpen?: boolean;
  selectedDmChannelId?: number;
  selectedChannelId?: number;
};

const stateWith = ({
  activeFullscreenPluginId,
  threadsOpen = false,
  selectedThread,
  dmsOpen = false,
  selectedDmChannelId,
  selectedChannelId
}: TView) =>
  ({
    server: {
      activeFullscreenPluginId,
      threadsOpen,
      dmsOpen,
      selectedChannelId
    },
    app: { selectedThread, selectedDmChannelId }
  }) as unknown as IRootState;

// closeMobileContent, which this selector answers to, is covered end to end in
// packages/e2e (mobile-navigation.spec.ts): importing actions here needs a browser window
describe('isMobileContentOpenSelector', () => {
  test('should show the list while nothing is open', () => {
    expect(isMobileContentOpenSelector(stateWith({}))).toBe(false);
  });

  test('should show the channel that is open', () => {
    expect(
      isMobileContentOpenSelector(stateWith({ selectedChannelId: 3 }))
    ).toBe(true);
  });

  // the server keeps its selected channel while the DM list shows, and that list is what
  // the phone is looking at
  test('should show the DM list while no conversation is open in it', () => {
    const state = stateWith({ dmsOpen: true, selectedChannelId: 3 });

    expect(isMobileContentOpenSelector(state)).toBe(false);
  });

  test('should show the conversation open in the DM list', () => {
    const state = stateWith({ dmsOpen: true, selectedDmChannelId: 9 });

    expect(isMobileContentOpenSelector(state)).toBe(true);
  });

  test('should show the thread list while no thread is open in it', () => {
    const state = stateWith({ threadsOpen: true, selectedChannelId: 3 });

    expect(isMobileContentOpenSelector(state)).toBe(false);
  });

  test('should show the thread open in the thread list', () => {
    const state = stateWith({
      threadsOpen: true,
      selectedThread: { parentMessageId: 5, channelId: 3 }
    });

    expect(isMobileContentOpenSelector(state)).toBe(true);
  });

  test('should show a full screen plugin over any list', () => {
    const state = stateWith({ activeFullscreenPluginId: 'board' });

    expect(isMobileContentOpenSelector(state)).toBe(true);
  });
});
