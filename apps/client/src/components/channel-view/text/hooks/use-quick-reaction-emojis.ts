import { useRecentEmojis } from '@/components/emoji-picker/use-recent-emojis';
import { withoutShadowedEmojis } from '@/components/tiptap-input/helpers';
import { useCustomEmojis } from '@/features/server/emojis/hooks';
import { useMemo } from 'react';

// the most recently used emoji, offered as one tap reactions next to a message
export const useQuickReactionEmojis = (limit: number) => {
  const { recentEmojis } = useRecentEmojis();
  const customEmojis = useCustomEmojis();

  // a built-in picked before a custom emoji took its name would show itself
  // but react with the custom one
  return useMemo(() => {
    const reachableEmojis = withoutShadowedEmojis(recentEmojis, customEmojis);

    return reachableEmojis.slice(0, limit);
  }, [recentEmojis, customEmojis, limit]);
};
