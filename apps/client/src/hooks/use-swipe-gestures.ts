import { useCallback, useRef } from 'react';

type TSwipeHandlers = {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
};

type TSwipeGestureHandlers = {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
};

// the parts of a dom element the check reads, so it can run without a browser
type TSwipeNode<TNode> = {
  parentElement: TNode | null;
  scrollWidth: number;
  clientWidth: number;
  matches(selectors: string): boolean;
};

type TSwipeStart<TNode extends TSwipeNode<TNode>> = {
  root: TNode & { contains(node: TNode | null): boolean };
  target: TNode | null;
  hasTextSelection: boolean;
  getOverflowX: (node: TNode) => string;
};

// a slider drags sideways by design, and anything else can opt out with the attribute
const NO_SWIPE_SELECTOR =
  '[role="slider"], [data-slot="slider"], [data-no-swipe]';

const SCROLLING_OVERFLOWS = ['auto', 'scroll'];

// a sideways drag only means "go back a screen" when nothing under the finger wants it. react
// bubbles touches out of portals (popovers, the image viewer) although their dom sits outside
// the view, a wide code block or table scrolls sideways, and a drag that selects text is a
// selection, not a swipe
const shouldIgnoreSwipe = <TNode extends TSwipeNode<TNode>>({
  root,
  target,
  hasTextSelection,
  getOverflowX
}: TSwipeStart<TNode>) => {
  if (hasTextSelection || !target || !root.contains(target)) {
    return true;
  }

  let node: TNode | null = target;

  while (node && node !== root) {
    const scrollsSideways =
      node.scrollWidth > node.clientWidth &&
      SCROLLING_OVERFLOWS.includes(getOverflowX(node));

    if (scrollsSideways || node.matches(NO_SWIPE_SELECTOR)) {
      return true;
    }

    node = node.parentElement;
  }

  return false;
};

const getOverflowX = (element: Element) => {
  const style = window.getComputedStyle(element);

  return style.overflowX;
};

const getHasTextSelection = () => {
  const selection = window.getSelection();

  return !!selection && !selection.isCollapsed;
};

const useSwipeGestures = (handlers: TSwipeHandlers): TSwipeGestureHandlers => {
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndY = useRef<number>(0);
  const ignored = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndY.current = e.touches[0].clientY;

    ignored.current = shouldIgnoreSwipe<Element>({
      root: e.currentTarget,
      target: e.target instanceof Element ? e.target : null,
      hasTextSelection: getHasTextSelection(),
      getOverflowX
    });
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (ignored.current) {
      return;
    }

    const swipeThreshold = 50; // minimum distance for swipe
    const diffX = touchEndX.current - touchStartX.current;
    const diffY = Math.abs(touchEndY.current - touchStartY.current);

    // ignore mostly vertical gestures and taps
    if (Math.abs(diffX) < swipeThreshold || Math.abs(diffX) <= diffY) {
      return;
    }

    if (diffX > 0 && handlers.onSwipeRight) {
      handlers.onSwipeRight();
    }

    if (diffX < 0 && handlers.onSwipeLeft) {
      handlers.onSwipeLeft();
    }
  }, [handlers]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
};

export { shouldIgnoreSwipe, useSwipeGestures };
