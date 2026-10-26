import {
  shouldUseFallbackImage,
  type TEmojiItem
} from '@/components/tiptap-input/helpers';
import { cn } from '@/lib/utils';
import { memo, useCallback } from 'react';

type TQuickReactionGlyphProps = {
  emoji: TEmojiItem;
  imageClassName?: string;
};

const QuickReactionGlyph = memo(
  ({ emoji, imageClassName }: TQuickReactionGlyphProps) => {
    if (emoji.emoji && !shouldUseFallbackImage(emoji)) {
      return <span>{emoji.emoji}</span>;
    }

    if (emoji.fallbackImage) {
      return (
        <img
          src={emoji.fallbackImage}
          alt={emoji.name}
          className={cn('w-5 h-5 object-contain', imageClassName)}
        />
      );
    }

    return <span>{emoji.name}</span>;
  }
);

type TQuickReactionButtonProps = {
  emoji: TEmojiItem;
  onSelect: (emoji: TEmojiItem) => void;
  className?: string;
  imageClassName?: string;
  testId?: string;
};

const QuickReactionButton = memo(
  ({
    emoji,
    onSelect,
    className,
    imageClassName,
    testId
  }: TQuickReactionButtonProps) => {
    const handleClick = useCallback(() => onSelect(emoji), [onSelect, emoji]);

    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'w-6 h-6 flex items-center justify-center hover:bg-accent rounded-md transition-colors text-md',
          className
        )}
        title={`:${emoji.shortcodes[0]}:`}
        data-testid={testId}
      >
        <QuickReactionGlyph emoji={emoji} imageClassName={imageClassName} />
      </button>
    );
  }
);

export { QuickReactionButton };
