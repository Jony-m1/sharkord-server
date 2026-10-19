import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@sharkord/ui';
import { memo, useCallback, useState } from 'react';
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

    const handleEmojiSelect = useCallback(
      (emoji: TEmojiItem) => {
        onEmojiSelect(emoji);
        setOpen(false);
      },
      [onEmojiSelect]
    );

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          className={PICKER_CONTENT_CLASS}
          align="start"
          sideOffset={8}
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
