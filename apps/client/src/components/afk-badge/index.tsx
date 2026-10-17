import { cn } from '@/lib/utils';
import { TestId } from '@sharkord/shared';
import { Moon } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TAfkBadgeProps = {
  iconOnly?: boolean;
  className?: string;
};

const AfkBadge = memo(({ iconOnly = false, className }: TAfkBadgeProps) => {
  const { t } = useTranslation('sidebar');

  return (
    <span
      data-testid={TestId.AFK_BADGE}
      title={t('afkAway')}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full bg-yellow-500/15 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-yellow-500',
        iconOnly ? 'px-1' : 'px-1.5',
        className
      )}
    >
      <Moon className="size-3" />
      {!iconOnly && t('afk')}
    </span>
  );
});

export { AfkBadge };
