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
  const previousRef = useRef({ isAfk, soundMuted });
  const deafenedByAfkRef = useRef(false);

  useEffect(() => {
    const { isAfk: wasAfk, soundMuted: wasSoundMuted } = previousRef.current;

    previousRef.current = { isAfk, soundMuted };

    // undeafening by hand while away hands the headphones back to you, so coming back
    // later does not touch a deafen you chose yourself
    if (wasSoundMuted && !soundMuted) {
      deafenedByAfkRef.current = false;
    }

    const change = getAfkDeafenChange({
      wasAfk,
      isAfk,
      soundMuted,
      deafenedByAfk: deafenedByAfkRef.current
    });

    if (!change) return;

    deafenedByAfkRef.current = change === 'deafen';

    // toggleSound behind it reports its own failures with a toast and rolls back
    setSoundMuted(change === 'deafen');
  }, [isAfk, soundMuted, setSoundMuted]);
};

export { useAfkDeafen };
