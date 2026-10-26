import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useModViewOpen } from '@/features/app/hooks';
import { useAdminUsers } from '@/features/server/admin/hooks';
import { LoadingCard } from '@sharkord/ui';
import { memo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { UsersTable } from './users-table';

const Users = memo(() => {
  const { t } = useTranslation('settings');
  const { users, loading, refetch } = useAdminUsers();
  const { isOpen: isModViewOpen } = useModViewOpen();
  const wasModViewOpenRef = useRef(isModViewOpen);

  // the moderation view a row opens can ban, unban or change roles, and the rows are a snapshot,
  // so they are fetched again once it closes. the store only says who is banned, not why or when
  useEffect(() => {
    if (wasModViewOpenRef.current && !isModViewOpen) refetch();

    wasModViewOpenRef.current = isModViewOpen;
  }, [isModViewOpen, refetch]);

  // only the first load replaces the table: a refetch after an unban or a delete keeps it, with its
  // filter, page and search, where it was
  if (loading && users.length === 0) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <SettingsSection title={t('usersTitle')} description={t('usersDesc')}>
      <UsersTable users={users} refetch={refetch} />
    </SettingsSection>
  );
});

export { Users };
