import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import { cn } from '@/lib/utils';
import { TestId } from '@sharkord/shared';
import { Popover, PopoverContent, PopoverTrigger } from '@sharkord/ui';
import { memo, useCallback, useRef, useState } from 'react';
import { EmojiPickerPanel, PICKER_PANEL_CONTENT_CLASS } from './picker-panel';

// the picker disappears at once instead of fading out: the reaction picker hangs off the
// message's hover toolbar, which hides the moment the picker closes, so a fade played out in the
// top left corner of the app with nothing left to anchor it. hidden rather than animate-none,
// which tailwind-merge does not see as overriding the fade
const PICKER_CONTENT_CLASS = cn(
  PICKER_PANEL_CONTENT_CLASS,
  'data-[state=closed]:hidden'
);

type TEmojiPickerProps = {
  children: React.ReactNode;
  onEmojiSelect: (emoji: TEmojiItem) => void;
  defaultTab?: 'native' | 'custom';
};

const EmojiPicker = memo(
  ({ children, onEmojiSelect, defaultTab }: TEmojiPickerProps) => {
    const [open, setOpen] = useState(false);
    const keepOpenRef = useRef(false);

    // the message box takes focus to insert the emoji, at once on ios and safari and on the
    // next frame elsewhere, and that focus leaving the picker would close it. a shift click
    // holds it open through both, then lets go
    const handleEmojiSelect = useCallback(
      (emoji: TEmojiItem, keepOpen: boolean) => {
        if (!keepOpen) {
          onEmojiSelect(emoji);
          setOpen(false);

          return;
        }

        keepOpenRef.current = true;

        onEmojiSelect(emoji);

        requestAnimationFrame(() => {
          keepOpenRef.current = false;
        });
      },
      [onEmojiSelect]
    );

    const handleFocusOutside = useCallback((event: Event) => {
      if (keepOpenRef.current) {
        event.preventDefault();
      }
    }, []);

    // the search field focuses itself where that does not raise a keyboard (picker-panel), so
    // the popover does not move focus into it on its own
    const handleOpenAutoFocus = useCallback((event: Event) => {
      event.preventDefault();
    }, []);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          className={PICKER_CONTENT_CLASS}
          align="start"
          sideOffset={8}
          onFocusOutside={handleFocusOutside}
          onOpenAutoFocus={handleOpenAutoFocus}
          data-emoji-picker
          data-testid={TestId.EMOJI_PICKER}
        >
          <EmojiPickerPanel
            onEmojiSelect={handleEmojiSelect}
            defaultTab={defaultTab}
          />
        </PopoverContent>
      </Popover>
    );
  }
);

EmojiPicker.displayName = 'EmojiPicker';

export { EmojiPicker };
