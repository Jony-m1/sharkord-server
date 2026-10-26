import type { LocalStorageKey } from '@/helpers/storage';
import { useResizableSidebar } from '@/hooks/use-resizable-sidebar';
import { cn } from '@/lib/utils';
import { memo, type ReactNode } from 'react';

type TResizableSidebarProps = {
  storageKey: LocalStorageKey;
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  edge: 'left' | 'right';
  isOpen?: boolean;
  className?: string;
  children: ReactNode;
  'data-testid'?: string;
};

// the width snaps open and shut, as on Discord: animating it relaid out the conversation, the
// call and every observer beside the panel on each frame. the panels on the right, the ones
// that open and close, fade and slide their contents in instead, which only touches opacity and
// transform. the left sidebar never closes, so it has nothing to play
const ENTRANCE_CLASSES =
  '*:animate-in *:fade-in-0 *:slide-in-from-right-2 *:duration-150 motion-reduce:*:animate-none';

const ResizableSidebar = memo(
  ({
    storageKey,
    minWidth,
    maxWidth,
    defaultWidth,
    edge,
    isOpen = true,
    className,
    children,
    ...props
  }: TResizableSidebarProps) => {
    const { size, isResizing, sidebarRef, handlePointerDown } =
      useResizableSidebar({
        storageKey,
        minSize: minWidth,
        maxSize: maxWidth,
        defaultSize: defaultWidth,
        edge
      });

    const isLeftEdge = edge === 'left';

    return (
      <div
        ref={sidebarRef}
        className={cn(
          'flex flex-col bg-card border-border relative',
          isLeftEdge ? 'border-l' : 'border-r',
          isLeftEdge && ENTRANCE_CLASSES,
          !isOpen && 'w-0 border-0! overflow-hidden',
          className
        )}
        style={{
          width: isOpen ? `${size}px` : '0px'
        }}
        {...props}
      >
        {isOpen && (
          <>
            <div
              data-no-swipe
              className={cn(
                'absolute top-0 bottom-0 w-1 cursor-col-resize touch-none hover:bg-primary/50 transition-colors z-50',
                isLeftEdge ? 'left-0' : 'right-0',
                isResizing && 'bg-primary'
              )}
              onPointerDown={handlePointerDown}
            />
            {children}
          </>
        )}
      </div>
    );
  }
);

export { ResizableSidebar };
