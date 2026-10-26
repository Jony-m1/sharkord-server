import { describe, expect, test } from 'bun:test';
import { shouldIgnoreSwipe } from '../use-swipe-gestures';

type TFakeNode = {
  parentElement: TFakeNode | null;
  scrollWidth: number;
  clientWidth: number;
  overflowX: string;
  selectors: string[];
  matches(selectors: string): boolean;
};

type TFakeRoot = TFakeNode & {
  contains(node: TFakeNode | null): boolean;
};

const createNode = ({
  parent = null,
  scrollWidth = 100,
  clientWidth = 100,
  overflowX = 'visible',
  selectors = []
}: {
  parent?: TFakeNode | null;
  scrollWidth?: number;
  clientWidth?: number;
  overflowX?: string;
  selectors?: string[];
}): TFakeNode => ({
  parentElement: parent,
  scrollWidth,
  clientWidth,
  overflowX,
  selectors,
  // the fake answers for the attributes it was given, the way a real element would for the
  // comma separated list the check asks about
  matches(list: string) {
    return list
      .split(',')
      .some((selector) => this.selectors.includes(selector.trim()));
  }
});

const createRoot = (): TFakeRoot => {
  const root = createNode({}) as TFakeRoot;

  root.contains = (node) => {
    let current = node;

    while (current) {
      if (current === root) return true;

      current = current.parentElement;
    }

    return false;
  };

  return root;
};

const getOverflowX = (node: TFakeNode) => node.overflowX;

const check = (
  root: TFakeRoot,
  target: TFakeNode | null,
  hasTextSelection = false
) => shouldIgnoreSwipe({ root, target, hasTextSelection, getOverflowX });

describe('shouldIgnoreSwipe', () => {
  test('should let a swipe on the conversation through', () => {
    const root = createRoot();
    const list = createNode({ parent: root, overflowX: 'auto' });
    const message = createNode({ parent: list });

    expect(check(root, message)).toBe(false);
  });

  test('should ignore a touch that starts outside the view, in a portal', () => {
    const root = createRoot();
    const portal = createNode({});
    const popoverContent = createNode({ parent: portal });

    expect(check(root, popoverContent)).toBe(true);
  });

  test('should ignore a touch without a target', () => {
    expect(check(createRoot(), null)).toBe(true);
  });

  test('should ignore a touch on a slider thumb', () => {
    const root = createRoot();
    const thumb = createNode({ parent: root, selectors: ['[role="slider"]'] });

    expect(check(root, thumb)).toBe(true);
  });

  test('should ignore a touch on a slider track, under the slider root', () => {
    const root = createRoot();
    const slider = createNode({
      parent: root,
      selectors: ['[data-slot="slider"]']
    });
    const track = createNode({ parent: slider });

    expect(check(root, track)).toBe(true);
  });

  test('should ignore a touch inside an element that opted out', () => {
    const root = createRoot();
    const handle = createNode({ parent: root, selectors: ['[data-no-swipe]'] });
    const grip = createNode({ parent: handle });

    expect(check(root, grip)).toBe(true);
  });

  test('should ignore a touch inside a block that scrolls sideways', () => {
    const root = createRoot();
    const codeBlock = createNode({
      parent: root,
      scrollWidth: 900,
      clientWidth: 300,
      overflowX: 'auto'
    });
    const line = createNode({ parent: codeBlock });

    expect(check(root, line)).toBe(true);
  });

  // wider content that is clipped cannot be scrolled, so it does not compete with the swipe
  test('should let a swipe through over content that overflows but is clipped', () => {
    const root = createRoot();
    const clipped = createNode({
      parent: root,
      scrollWidth: 900,
      clientWidth: 300,
      overflowX: 'hidden'
    });

    expect(check(root, clipped)).toBe(false);
  });

  test('should ignore a swipe while text is selected', () => {
    const root = createRoot();
    const message = createNode({ parent: root });

    expect(check(root, message, true)).toBe(true);
  });
});
