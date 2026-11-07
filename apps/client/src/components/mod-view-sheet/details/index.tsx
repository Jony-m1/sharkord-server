import { Protect } from '@/components/protect';
import { useDateLocale } from '@/hooks/use-date-locale';
import { Permission } from '@sharkord/shared/src/statics/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@sharkord/ui';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  ClipboardList,
  Clock,
  Gavel,
  IdCard,
  KeyRound
} from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useModViewContext } from '../context';
import { Row } from '../row';
import { LoginHistory } from './login-history';

const Details = memo(() => {
  const { t } = useTranslation('settings');
  const dateLocale = useDateLocale();
  const { user, logins } = useModViewContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          {t('detailsTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-2">
          <Row icon={IdCard} label={t('userIdLabel')} value={user.id} />

          <Protect permission={Permission.VIEW_USER_SENSITIVE_DATA}>
            <Row
              icon={IdCard}
              label={t('identityDetailLabel')}
              value={user.identity ?? ''}
              hidden
            />
          </Protect>

          <Row
            icon={KeyRound}
            label={t('accountSourceLabel')}
            value={
              user.isOidcUser
                ? t('accountSourceOidc')
                : t('accountSourcePassword')
            }
          />

          <Row
            icon={Calendar}
            label={t('joinedServerLabel')}
            value={formatDistanceToNow(user.createdAt, {
              addSuffix: true,
              locale: dateLocale
            })}
          />

          <Row
            icon={Clock}
            label={t('lastActiveLabel')}
            value={formatDistanceToNow(user.lastLoginAt, {
              addSuffix: true,
              locale: dateLocale
            })}
          />

          {user.banned && (
            <>
              <Row
                icon={Gavel}
                label={t('bannedDetailLabel')}
                value={t('bannedDetailValue')}
              />

              <Row
                icon={Gavel}
                label={t('banReasonLabel')}
                value={user.banReason || t('noReasonProvidedDetail')}
              />

              <Row
                icon={Gavel}
                label={t('bannedAtLabel')}
                value={format(user.bannedAt ?? 0, 'PPP', {
                  locale: dateLocale
                })}
                details={format(user.bannedAt ?? 0, 'PPpp', {
                  locale: dateLocale
                })}
              />
            </>
          )}
        </div>

        <Protect permission={Permission.VIEW_USER_SENSITIVE_DATA}>
          <LoginHistory logins={logins} />
        </Protect>
      </CardContent>
    </Card>
  );
});

export { Details };
