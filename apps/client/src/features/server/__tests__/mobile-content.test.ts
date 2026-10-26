import type { IRootState } from '@/features/store';
import { describe, expect, test } from 'bun:test';
import { isMobileContentOpenSelector } from '../selectors';

type TView = {
  mobileContentClosing?: boolean;
  activeFullscreenPluginId?: string;
  threadsOpen?: boolean;
  selectedThread?: { parentMessageId: number; channelId: number };
  dmsOpen?: boolean;
  selectedDmChannelId?: number;
  selectedChannelId?: number;
};

const stateWith = ({
  mobileContentClosing = false,
  activeFullscreenPluginId,
  threadsOpen = false,
  selectedThread,
  dmsOpen = false,
  selectedDmChannelId,
  selectedChannelId
}: TView) =>
  ({
    server: {
      mobileContentClosing,
      activeFullscreenPluginId,
      threadsOpen,
      dmsOpen,
      selectedChannelId
    },
    app: { selectedThread, selectedDmChannelId }
  }) as unknown as IRootState;

// closeMobileContent, which this selector answers to, is covered in server-navigation.test.ts
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

  // back slides the list over the conversation first and closes it once it is covered, so
  // the list is what shows while the conversation is still open under it
  test('should show the list while back slides it over the conversation', () => {
    const state = stateWith({
      mobileContentClosing: true,
      selectedChannelId: 3
    });

    expect(isMobileContentOpenSelector(state)).toBe(false);
  });

  test('should show the list while back slides it over a full screen plugin', () => {
    const state = stateWith({
      mobileContentClosing: true,
      activeFullscreenPluginId: 'board'
    });

    expect(isMobileContentOpenSelector(state)).toBe(false);
  });
});
