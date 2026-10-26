import { useCallback, useEffect, useMemo, useRef } from 'react';

// a little under the ~500ms after which ios starts its own text selection and link preview
const LONG_PRESS_MS = 450;

const MOVE_TOLERANCE_PX = 10;

type TPoint = {
  x: number;
  y: number;
};

type TLongPressHandlers = {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onClickCapture: (event: React.MouseEvent<HTMLElement>) => void;
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
};

// a finger drifts a little while it holds still, further than that it is a scroll or a swipe
export const isPastMoveTolerance = (start: TPoint, current: TPoint) => {
  const distance = Math.hypot(current.x - start.x, current.y - start.y);

  return distance > MOVE_TOLERANCE_PX;
};

// holding a finger on an element, where a touch screen has neither hover nor right click. only
// a touch starts it, so a mouse keeps its click and its context menu. a scroll needs no check
// of its own: the browser cancels the pointer as soon as it takes the touch over for panning.
// pass no callback to turn it off
export const useLongPress = (
  onLongPress: (() => void) | undefined
): TLongPressHandlers => {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const startRef = useRef<TPoint>(undefined);
  const firedRef = useRef(false);
  const isTouchRef = useRef(false);

  const cancel = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = undefined;
    startRef.current = undefined;
  }, []);

  useEffect(() => cancel, [cancel]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      // a new touch is a new gesture, so a click that no long press came before goes through
      firedRef.current = false;
      isTouchRef.current = event.pointerType === 'touch';
      cancel();

      if (!onLongPress || !isTouchRef.current || !event.isPrimary) return;

      // react bubbles events out of portals, such as the sheet a long press opens, although
      // their dom sits outside this element
      const target = event.target as Node;

      if (!event.currentTarget.contains(target)) return;

      startRef.current = { x: event.clientX, y: event.clientY };
      timerRef.current = setTimeout(() => {
        timerRef.current = undefined;
        startRef.current = undefined;
        firedRef.current = true;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    [cancel, onLongPress]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const start = startRef.current;

      if (!start) return;

      const current = { x: event.clientX, y: event.clientY };

      if (isPastMoveTolerance(start, current)) {
        cancel();
      }
    },
    [cancel]
  );

  // lifting the finger after a long press would also click whatever is under it, a link in the
  // message or a row of the sheet that opened under the finger
  const onClickCapture = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (!firedRef.current) return;

    firedRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  // android answers a long press with its own menu for links and images, and shows its copy and
  // paste toolbar the same way. so only a long press on this element's own content cancels it:
  // the edit box, where the long press is off, and the portals react bubbles out of (the sheet's
  // search field, the image viewer) keep theirs
  const onContextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (!onLongPress || !isTouchRef.current) return;

      const target = event.target as Node;

      if (!event.currentTarget.contains(target)) return;

      event.preventDefault();
    },
    [onLongPress]
  );

  return useMemo(
    () => ({
      onPointerDown,
      onPointerMove,
      onPointerUp: cancel,
      onPointerCancel: cancel,
      onClickCapture,
      onContextMenu
    }),
    [onPointerDown, onPointerMove, cancel, onClickCapture, onContextMenu]
  );
};
