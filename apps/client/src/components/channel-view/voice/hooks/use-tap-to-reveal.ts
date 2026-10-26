import { useCallback, useState } from 'react';

// a touch screen has no hover, so a tap on a card shows its controls and the next tap hides
// them. the cards apply it under pointer-coarse only, so a mouse click changes nothing there
export const useTapToReveal = () => {
  const [isRevealed, setIsRevealed] = useState(false);

  const toggleRevealed = useCallback((event: React.MouseEvent) => {
    const target = event.target as Element;

    // a tap on one of the controls uses it and leaves them showing
    if (target.closest('button')) return;

    setIsRevealed((revealed) => !revealed);
  }, []);

  return { isRevealed, toggleRevealed };
};
