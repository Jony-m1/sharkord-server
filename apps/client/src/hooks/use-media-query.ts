import { useCallback, useSyncExternalStore } from 'react';

// for a part that has to be left out by layout rather than hidden with css, where a hidden copy
// would still be found twice by anything looking for it. the first render already has the
// answer, so the layout is right on the first frame
export const useMediaQuery = (query: string) => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mediaQuery = window.matchMedia(query);

      mediaQuery.addEventListener('change', onChange);

      return () => mediaQuery.removeEventListener('change', onChange);
    },
    [query]
  );

  const getSnapshot = useCallback(() => {
    const mediaQuery = window.matchMedia(query);

    return mediaQuery.matches;
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot);
};
