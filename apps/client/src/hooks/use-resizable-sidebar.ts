import { clamp } from '@/helpers/clamp';
import {
  getLocalStorageItem,
  type LocalStorageKey,
  setLocalStorageItem
} from '@/helpers/storage';
import { useCallback, useEffect, useRef, useState } from 'react';

// the side of the panel its drag handle sits on: left and right resize the width, top the height
type TResizeEdge = 'left' | 'right' | 'top';

type TResizableSidebarOptions = {
  storageKey: LocalStorageKey;
  minSize: number;
  maxSize: number;
  defaultSize: number;
  edge: TResizeEdge;
};

// the size that puts the handle under the pointer, measured from the panel's fixed side
const getDraggedSize = (
  edge: TResizeEdge,
  rect: Pick<DOMRect, 'left' | 'right' | 'bottom'>,
  pointer: Pick<PointerEvent, 'clientX' | 'clientY'>
) => {
  if (edge === 'top') {
    return rect.bottom - pointer.clientY;
  }

  if (edge === 'left') {
    return rect.right - pointer.clientX;
  }

  return pointer.clientX - rect.left;
};

// a size saved under older limits, or garbage, still has to land inside the current ones
const getSavedSize = (
  saved: string | null,
  minSize: number,
  maxSize: number,
  defaultSize: number
) => {
  const savedSize = Number(saved);

  if (!savedSize) {
    return defaultSize;
  }

  return clamp(savedSize, minSize, maxSize);
};

const useResizableSidebar = ({
  storageKey,
  minSize,
  maxSize,
  defaultSize,
  edge
}: TResizableSidebarOptions) => {
  const [size, setSize] = useState(() => {
    const saved = getLocalStorageItem(storageKey);

    return getSavedSize(saved, minSize, maxSize, defaultSize);
  });

  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // pointer events so a finger can drag it too, and the capture keeps the drag going over
  // embedded players, which would otherwise swallow the moves. a handle opts out of the swipe
  // navigation with data-no-swipe, see use-swipe-gestures
  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    let draggedSize: number | undefined;

    const handlePointerMove = (event: PointerEvent) => {
      const sidebar = sidebarRef.current;

      if (!sidebar) return;

      const rect = sidebar.getBoundingClientRect();

      draggedSize = clamp(getDraggedSize(edge, rect, event), minSize, maxSize);
      setSize(draggedSize);
    };

    // saved once when the drag ends, not with a synchronous storage write on every move
    const handlePointerUp = () => {
      setIsResizing(false);

      if (draggedSize === undefined) return;

      setLocalStorageItem(storageKey, Math.round(draggedSize).toString());
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isResizing, edge, minSize, maxSize, storageKey]);

  return {
    size,
    isResizing,
    sidebarRef,
    handlePointerDown
  };
};

export { getDraggedSize, getSavedSize, useResizableSidebar };
