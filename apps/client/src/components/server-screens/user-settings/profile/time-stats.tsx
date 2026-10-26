import { formatTotalDuration } from '@/helpers/format-duration';
import { getTRPCClient } from '@/lib/trpc';
import { Clock, Headphones } from 'lucide-react';
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

type TCompactStatProps = TStatProps & {
  icon: typeof Clock;
};

const CompactStat = memo(({ icon: Icon, label, value }: TCompactStatProps) => (
  <div className="flex min-w-0 items-center gap-1.5" title={label}>
    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    <span className="truncate text-xs text-muted-foreground">{label}</span>
    <span className="text-xs font-semibold tabular-nums">{value}</span>
  </div>
));

type TTimeStatsProps = {
  userId?: number;
  compact?: boolean;
};

// the totals are kept by the server across every device; between refreshes the running
// sessions are counted on here from when they were fetched, which needs no clock agreement.
// without a userId it shows your own
const TimeStats = memo(({ userId, compact = false }: TTimeStatsProps) => {
  const { t } = useTranslation('settings');
  const [stats, setStats] = useState<TTimeStats>();
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const trpc = getTRPCClient();
        const result = await trpc.users.getTimeStats.query(
          userId === undefined ? undefined : { userId }
        );

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
  }, [userId]);

  if (!stats) return null;

  const elapsed = Math.max(0, now - stats.fetchedAt);
  const onlineValue = formatTotalDuration(
    stats.onlineTimeMs + (stats.online ? elapsed : 0)
  );
  const voiceValue = formatTotalDuration(
    stats.voiceTimeMs + (stats.inVoice ? elapsed : 0)
  );

  if (compact) {
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <CompactStat
          icon={Clock}
          label={t('timeOnlineCompact')}
          value={onlineValue}
        />
        <CompactStat
          icon={Headphones}
          label={t('timeInCallsCompact')}
          value={voiceValue}
        />
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      <Stat label={t('totalTimeOnSharkord')} value={onlineValue} />
      <Stat label={t('totalTimeInCall')} value={voiceValue} />
    </div>
  );
});

export { TimeStats };
