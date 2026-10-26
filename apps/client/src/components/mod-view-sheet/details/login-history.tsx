import { useDateLocale } from '@/hooks/use-date-locale';
import type { TLogin } from '@sharkord/shared';
import { IconButton, Tooltip } from '@sharkord/ui';
import { format, formatDistanceToNow } from 'date-fns';
import { Eye, EyeClosed, History } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

type TLoginRowProps = {
  login: TLogin;
};

// where someone signed in from is personal, so each row stays masked until it is asked for
const LoginRow = memo(({ login }: TLoginRowProps) => {
  const { t } = useTranslation('settings');
  const dateLocale = useDateLocale();
  const [visible, setVisible] = useState(false);

  const toggleVisible = useCallback(() => {
    setVisible((current) => !current);
  }, []);

  const placeParts = [login.city, login.country].filter(Boolean);
  const deviceParts = [login.os, login.device].filter(Boolean);
  const place = placeParts.join(', ') || t('naValue');
  const device = deviceParts.join(' ');

  let details = '***';

  if (visible) {
    details = t('loginPlaceAndIp', {
      place,
      ip: login.ip || t('unknownValue')
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 px-1 py-1.5">
      <div className="min-w-0 flex-1">
        <Tooltip
          content={format(login.createdAt, 'PPpp', { locale: dateLocale })}
        >
          <p className="truncate text-sm">
            {formatDistanceToNow(login.createdAt, {
              addSuffix: true,
              locale: dateLocale
            })}
            {device && (
              <span className="text-muted-foreground"> · {device}</span>
            )}
          </p>
        </Tooltip>
        <p className="truncate text-xs text-muted-foreground">{details}</p>
      </div>
      <IconButton
        icon={visible ? EyeClosed : Eye}
        variant="ghost"
        size="sm"
        title={visible ? t('hideLoginDetails') : t('showLoginDetails')}
        onClick={toggleVisible}
      />
    </div>
  );
});

type TLoginHistoryProps = {
  logins: TLogin[];
};

const LoginHistory = memo(({ logins }: TLoginHistoryProps) => {
  const { t } = useTranslation('settings');

  if (logins.length === 0) return null;

  return (
    <div className="space-y-1 border-t border-border pt-3">
      <div className="flex items-center gap-3 px-1 pb-1">
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t('recentLoginsTitle')}</span>
      </div>
      {logins.map((login) => (
        <LoginRow key={login.id} login={login} />
      ))}
    </div>
  );
});

export { LoginHistory };
