import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useOwnUserId } from '@/features/server/users/hooks';
import {
  useCallJoinedAt,
  useCallStartedAt
} from '@/features/server/voice/hooks';
import { formatCallDuration } from '@/helpers/format-duration';
import { Tooltip } from '@sharkord/ui';
import { User, Users } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type TCallTimerMode = 'own' | 'call';

const CallTimer = memo(() => {
  const { t } = useTranslation('sidebar');
  const channelId = useCurrentVoiceChannelId();
  const ownUserId = useOwnUserId();
  const joinedAt = useCallJoinedAt(channelId ?? 0, ownUserId ?? 0);
  const startedAt = useCallStartedAt(channelId ?? 0);
  // a fresh panel, so a fresh call, starts on your own time
  const [mode, setMode] = useState<TCallTimerMode>('own');
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(interval);
  }, []);

  // the timer sits on the row that opens the connection stats, which the toggle must not open
  const onClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setMode((current) => (current === 'own' ? 'call' : 'own'));
  }, []);

  const since = mode === 'own' ? joinedAt : (startedAt ?? joinedAt);

  if (since === undefined) return null;

  const Icon = mode === 'own' ? User : Users;

  return (
    <Tooltip content={mode === 'own' ? t('callTimerOwn') : t('callTimerCall')}>
      <button
        type="button"
        data-call-timer={mode}
        onClick={onClick}
        className="ml-auto flex items-center gap-1 rounded px-1 text-xs font-medium tabular-nums text-muted-foreground transition-colors hover:text-foreground"
      >
        <Icon className="h-3 w-3" />
        {formatCallDuration(now - since)}
      </button>
    </Tooltip>
  );
});

export { CallTimer };
