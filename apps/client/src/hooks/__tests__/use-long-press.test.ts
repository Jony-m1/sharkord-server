import { describe, expect, test } from 'bun:test';
import { createElement, type MouseEvent, type PointerEvent } from 'react';
import { renderToString } from 'react-dom/server';
import { isPastMoveTolerance, useLongPress } from '../use-long-press';

describe('isPastMoveTolerance', () => {
  const start = { x: 100, y: 200 };

  test('a finger that holds still is still a long press', () => {
    expect(isPastMoveTolerance(start, start)).toBe(false);
  });

  test('the drift of a finger holding still is tolerated', () => {
    expect(isPastMoveTolerance(start, { x: 106, y: 208 })).toBe(false);
  });

  test('exactly the tolerance is still a hold', () => {
    expect(isPastMoveTolerance(start, { x: 110, y: 200 })).toBe(false);
  });

  test('a vertical move past the tolerance is a scroll', () => {
    expect(isPastMoveTolerance(start, { x: 100, y: 211 })).toBe(true);
  });

  test('a sideways move past the tolerance is a swipe', () => {
    expect(isPastMoveTolerance(start, { x: 89, y: 200 })).toBe(true);
  });

  test('a diagonal move counts its whole length, not each axis', () => {
    expect(isPastMoveTolerance(start, { x: 108, y: 208 })).toBe(true);
  });
});

type TLongPressHandlers = ReturnType<typeof useLongPress>;

// the handlers a component gets, without a browser: rendering to a string runs the hook
const renderLongPress = (onLongPress: (() => void) | undefined) => {
  let handlers: TLongPressHandlers | undefined;

  const Harness = () => {
    handlers = useLongPress(onLongPress);

    return null;
  };

  renderToString(createElement(Harness));

  if (!handlers) {
    throw new Error('the hook did not render');
  }

  return handlers;
};

const noop = () => {};

// what the message holds, and what react bubbles to it from a portal although its dom is
// elsewhere, such as the sheet's search field or the image viewer
const ownContent = {};
const portalContent = {};
const message = { contains: (node: unknown) => node === ownContent };

const pressDown = (
  handlers: TLongPressHandlers,
  pointerType: string,
  target: object
) => {
  handlers.onPointerDown({
    pointerType,
    isPrimary: true,
    target,
    currentTarget: message,
    clientX: 0,
    clientY: 0
  } as unknown as PointerEvent<HTMLElement>);
};

// the menu comes while the finger is still down, and lifting it stops the long press timer
const isContextMenuCancelled = (
  handlers: TLongPressHandlers,
  pointerType: string,
  target: object
) => {
  let cancelled = false;

  pressDown(handlers, pointerType, target);
  handlers.onContextMenu({
    target,
    currentTarget: message,
    preventDefault: () => {
      cancelled = true;
    }
  } as unknown as MouseEvent<HTMLElement>);
  handlers.onPointerUp();

  return cancelled;
};

describe('useLongPress context menu', () => {
  test('a finger held on the message gets the sheet, not the browser menu', () => {
    const handlers = renderLongPress(noop);

    expect(isContextMenuCancelled(handlers, 'touch', ownContent)).toBe(true);
  });

  test('a right click keeps the browser menu', () => {
    const handlers = renderLongPress(noop);

    expect(isContextMenuCancelled(handlers, 'mouse', ownContent)).toBe(false);
  });

  // android's copy and paste toolbar comes the same way as its menu, and editing turns the
  // long press off
  test('the edit box keeps its copy and paste toolbar', () => {
    const handlers = renderLongPress(undefined);

    expect(isContextMenuCancelled(handlers, 'touch', ownContent)).toBe(false);
  });

  test('a portal keeps its menu, such as the image viewer its save image', () => {
    const handlers = renderLongPress(noop);

    expect(isContextMenuCancelled(handlers, 'touch', portalContent)).toBe(
      false
    );
  });
});
