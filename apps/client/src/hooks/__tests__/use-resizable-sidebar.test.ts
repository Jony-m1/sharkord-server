import { describe, expect, test } from 'bun:test';
import { getDraggedSize, getSavedSize } from '../use-resizable-sidebar';

const MIN = 160;
const MAX = 1200;
const DEFAULT = 360;

// a panel from x 100 to 400 and y 200 to 700
const rect = { left: 100, right: 400, bottom: 700 };

describe('getDraggedSize', () => {
  // the call's chat: its handle is on top and its bottom stays put
  test('should measure a top handle up from the bottom of the panel', () => {
    expect(getDraggedSize('top', rect, { clientX: 0, clientY: 450 })).toBe(250);
  });

  // a panel on the right of the screen: its handle is on its left and its right stays put
  test('should measure a left handle back from the right of the panel', () => {
    expect(getDraggedSize('left', rect, { clientX: 150, clientY: 0 })).toBe(
      250
    );
  });

  // a panel on the left of the screen: its handle is on its right and its left stays put
  test('should measure a right handle out from the left of the panel', () => {
    expect(getDraggedSize('right', rect, { clientX: 350, clientY: 0 })).toBe(
      250
    );
  });

  test('should only follow the axis of its edge', () => {
    expect(getDraggedSize('top', rect, { clientX: 999, clientY: 450 })).toBe(
      250
    );
    expect(getDraggedSize('right', rect, { clientX: 350, clientY: 999 })).toBe(
      250
    );
  });
});

describe('getSavedSize', () => {
  test('should use the saved size when it is inside the limits', () => {
    expect(getSavedSize('420', MIN, MAX, DEFAULT)).toBe(420);
  });

  test('should use the default when nothing was saved', () => {
    expect(getSavedSize(null, MIN, MAX, DEFAULT)).toBe(DEFAULT);
  });

  test('should use the default for a saved value that is not a number', () => {
    expect(getSavedSize('wide', MIN, MAX, DEFAULT)).toBe(DEFAULT);
    expect(getSavedSize('', MIN, MAX, DEFAULT)).toBe(DEFAULT);
  });

  test('should use the default for a saved zero', () => {
    expect(getSavedSize('0', MIN, MAX, DEFAULT)).toBe(DEFAULT);
  });

  test('should raise a size saved under a lower minimum to the current one', () => {
    expect(getSavedSize('80', MIN, MAX, DEFAULT)).toBe(MIN);
    expect(getSavedSize('-40', MIN, MAX, DEFAULT)).toBe(MIN);
  });

  test('should lower a size saved under a higher maximum to the current one', () => {
    expect(getSavedSize('5000', MIN, MAX, DEFAULT)).toBe(MAX);
    expect(getSavedSize('Infinity', MIN, MAX, DEFAULT)).toBe(MAX);
  });
});
