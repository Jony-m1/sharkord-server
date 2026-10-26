import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject
} from 'react';

const IDLE_TIMEOUT = 3000;

// safari's own name for a video's fullscreen, the only kind an iphone has; not in the dom typings
type TWebkitVideoElement = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
};

export const enterVideoFullscreen = (container: HTMLElement) => {
  const video = container.querySelector<TWebkitVideoElement>('video');

  if (!video || typeof video.webkitEnterFullscreen !== 'function') {
    return false;
  }

  video.webkitEnterFullscreen();

  // the player's done button pauses the video, and the tile has no controls to play it again,
  // so a stream would stay frozen on its last frame. autoplay only starts a new stream
  const resume = async () => {
    try {
      await video.play();
    } catch {
      // the tile keeps the frame it stopped on until the stream changes, as it did before
    }
  };

  video.addEventListener('webkitendfullscreen', resume, { once: true });

  return true;
};

export const useFullscreen = (containerRef: RefObject<HTMLElement | null>) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const resetIdleTimer = useCallback(() => {
    setIsOverlayVisible(true);
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(
      () => setIsOverlayVisible(false),
      IDLE_TIMEOUT
    );
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const entered = document.fullscreenElement === containerRef.current;
      setIsFullscreen(entered);

      if (entered) {
        resetIdleTimer();
      } else {
        clearTimeout(idleTimerRef.current);
        setIsOverlayVisible(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      clearTimeout(idleTimerRef.current);
    };
  }, [containerRef, resetIdleTimer]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isFullscreen) return;

    const onActivity = () => resetIdleTimer();

    el.addEventListener('mousemove', onActivity);
    el.addEventListener('touchstart', onActivity);
    el.addEventListener('keydown', onActivity);

    return () => {
      el.removeEventListener('mousemove', onActivity);
      el.removeEventListener('touchstart', onActivity);
      el.removeEventListener('keydown', onActivity);
    };
  }, [isFullscreen, containerRef, resetIdleTimer]);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;

    if (!container) return;

    if (document.fullscreenElement === container) {
      try {
        await document.exitFullscreen();
      } catch {
        console.warn('Fullscreen toggle failed');
      }

      return;
    }

    // an iphone has no fullscreen for elements, only the native player of a video, which also
    // offers picture in picture and turns with the phone. it ends on its own done button
    if (typeof container.requestFullscreen !== 'function') {
      enterVideoFullscreen(container);

      return;
    }

    try {
      await container.requestFullscreen();
    } catch {
      // a web view can offer element fullscreen and still refuse it
      if (!enterVideoFullscreen(container)) {
        console.warn('Fullscreen toggle failed');
      }
    }
  }, [containerRef]);

  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, toggleFullscreen]);

  const handleDoubleClick = useCallback(() => {
    toggleFullscreen();
  }, [toggleFullscreen]);

  return {
    isFullscreen,
    isOverlayVisible,
    toggleFullscreen,
    handleDoubleClick
  };
};
