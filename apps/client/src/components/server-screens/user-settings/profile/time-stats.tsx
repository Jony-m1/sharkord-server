import { formatTotalDuration } from '@/helpers/format-duration';
import { getTRPCClient } from '@/lib/trpc';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type TTimeStats = {
  onlineTimeMs: number;
  voiceTimeMs: number;
  online: boolean;
  inVoice: boolean;
  fetchedAt: number;
};

const REFRESH_MS = 60_000;

type TStatProps = {
  label: string;
  value: string;
};

const Stat = memo(({ label, value }: TStatProps) => (
  <div className="flex flex-col items-end">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold tabular-nums">{value}</span>
  </div>
));

// the totals are kept by the server across every device; between refreshes the running
// sessions are counted on here from when they were fetched, which needs no clock agreement
const TimeStats = memo(() => {
  const { t } = useTranslation('settings');
  const [stats, setStats] = useState<TTimeStats>();
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const trpc = getTRPCClient();
        const result = await trpc.users.getTimeStats.query();

        if (!cancelled) setStats({ ...result, fetchedAt: Date.now() });
      } catch {
        // an older server has no totals; the card shows none
      }
    };

    load();

    const refresh = setInterval(load, REFRESH_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      cancelled = true;
      clearInterval(refresh);
      clearInterval(tick);
    };
  }, []);

  if (!stats) return null;

  const elapsed = Math.max(0, now - stats.fetchedAt);

  return (
    <div className="flex gap-6">
      <Stat
        label={t('totalTimeOnSharkord')}
        value={formatTotalDuration(
          stats.onlineTimeMs + (stats.online ? elapsed : 0)
        )}
      />
      <Stat
        label={t('totalTimeInCall')}
        value={formatTotalDuration(
          stats.voiceTimeMs + (stats.inVoice ? elapsed : 0)
        )}
      />
    </div>
  );
});

export { TimeStats };
