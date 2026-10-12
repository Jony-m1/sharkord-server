import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import { useIsShiftHeld } from '@/features/app/hooks';
import { Popover, PopoverContent, PopoverTrigger } from '@sharkord/ui';
import { memo, useCallback, useState } from 'react';
import { EmojiPickerPanel, PICKER_PANEL_CONTENT_CLASS } from './picker-panel';

type TEmojiPickerProps = {
  children: React.ReactNode;
  onEmojiSelect: (emoji: TEmojiItem) => void;
  defaultTab?: 'native' | 'custom';
};

const EmojiPicker = memo(
  ({ children, onEmojiSelect, defaultTab }: TEmojiPickerProps) => {
    const [open, setOpen] = useState(false);
    const isShiftHeld = useIsShiftHeld();

    // holding shift keeps the picker open to pick several emojis in a row
    const handleEmojiSelect = useCallback(
      (emoji: TEmojiItem) => {
        onEmojiSelect(emoji);

        if (!isShiftHeld) {
          setOpen(false);
        }
      },
      [onEmojiSelect, isShiftHeld]
    );

    // inserting into the message box focuses it, which would close the picker as focus moving outside
    const handleFocusOutside = useCallback(
      (event: Event) => {
        if (isShiftHeld) {
          event.preventDefault();
        }
      },
      [isShiftHeld]
    );

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          className={PICKER_PANEL_CONTENT_CLASS}
          align="start"
          sideOffset={8}
          onFocusOutside={handleFocusOutside}
          data-shift-select
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
