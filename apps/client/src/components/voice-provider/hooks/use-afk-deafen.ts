import { useIsUserAfk, useOwnUserId } from '@/features/server/users/hooks';
import { useEffect, useRef } from 'react';
import { getAfkDeafenChange } from '../helpers';

type TUseAfkDeafenParams = {
  soundMuted: boolean;
  setSoundMuted: (muted: boolean) => Promise<void>;
};

// follows the own AFK status rather than the button, so the keybind and another session
// marking you away deafen this one too
const useAfkDeafen = ({ soundMuted, setSoundMuted }: TUseAfkDeafenParams) => {
  const ownUserId = useOwnUserId();
  const isAfk = useIsUserAfk(ownUserId ?? null);
  const wasAfkRef = useRef(isAfk);

  useEffect(() => {
    const wasAfk = wasAfkRef.current;

    wasAfkRef.current = isAfk;

    const change = getAfkDeafenChange({ wasAfk, isAfk, soundMuted });

    if (!change) return;

    // toggleSound behind it reports its own failures with a toast and rolls back
    setSoundMuted(change === 'deafen');
  }, [isAfk, soundMuted, setSoundMuted]);
};

export { useAfkDeafen };
