import { PaginatedTable } from '@/components/paginated-table';
import type { TAdminUser } from '@/features/server/admin/hooks';
import { useRoles } from '@/features/server/roles/hooks';
import {
  useBannedUserIds,
  useOnlineUserIds
} from '@/features/server/users/hooks';
import { cn } from '@/lib/utils';
import { TestId } from '@sharkord/shared';
import { Button } from '@sharkord/ui';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { USERS_GRID_COLS } from './grid';
import { TableUser } from './table-user';

enum UsersFilter {
  ALL = 'all',
  ONLINE = 'online',
  BANNED = 'banned'
}

const FILTERS = [UsersFilter.ALL, UsersFilter.ONLINE, UsersFilter.BANNED];

const FILTER_LABEL_KEYS: Record<UsersFilter, string> = {
  [UsersFilter.ALL]: 'usersFilterAll',
  [UsersFilter.ONLINE]: 'usersFilterOnline',
  [UsersFilter.BANNED]: 'usersFilterBanned'
};

const getUserKey = (user: TAdminUser) => user.id;

type TFilterChipProps = {
  filter: UsersFilter;
  count: number;
  isActive: boolean;
  onSelect: (filter: UsersFilter) => void;
};

const FilterChip = memo(
  ({ filter, count, isActive, onSelect }: TFilterChipProps) => {
    const { t } = useTranslation('settings');

    const handleClick = useCallback(() => {
      onSelect(filter);
    }, [onSelect, filter]);

    return (
      <Button
        data-testid={TestId.USERS_FILTER}
        data-filter={filter}
        aria-pressed={isActive}
        variant={isActive ? 'secondary' : 'ghost'}
        size="sm"
        className={cn('h-7 rounded-full', !isActive && 'text-muted-foreground')}
        onClick={handleClick}
      >
        {t(FILTER_LABEL_KEYS[filter])}
        <span className="tabular-nums opacity-70">{count}</span>
      </Button>
    );
  }
);

type TUsersTableProps = {
  users: TAdminUser[];
  refetch?: () => void;
};

const UsersTable = memo(({ users, refetch }: TUsersTableProps) => {
  const { t } = useTranslation('settings');
  const roles = useRoles();
  const onlineUserIds = useOnlineUserIds();
  const bannedUserIds = useBannedUserIds();
  const [filter, setFilter] = useState(UsersFilter.ALL);

  const roleNamesById = useMemo(() => {
    const map = new Map<number, string>();

    roles.forEach((role) => {
      map.set(role.id, role.name.toLowerCase());
    });

    return map;
  }, [roles]);

  const usersByFilter = useMemo(
    () => ({
      [UsersFilter.ALL]: users,
      [UsersFilter.ONLINE]: users.filter((user) => onlineUserIds.has(user.id)),
      [UsersFilter.BANNED]: users.filter((user) => bannedUserIds.has(user.id))
    }),
    [users, onlineUserIds, bannedUserIds]
  );

  const searchFilter = useCallback(
    (user: TAdminUser, searchTerm: string) => {
      const query = searchTerm.toLowerCase();

      if (user.name.toLowerCase().includes(query)) return true;

      return user.roleIds.some((roleId) => {
        const roleName = roleNamesById.get(roleId);

        return roleName !== undefined && roleName.includes(query);
      });
    },
    [roleNamesById]
  );

  const renderRow = useCallback(
    (user: TAdminUser) => <TableUser user={user} refetch={refetch} />,
    [refetch]
  );

  const toolbar = useMemo(
    () => (
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((item) => (
          <FilterChip
            key={item}
            filter={item}
            count={usersByFilter[item].length}
            isActive={filter === item}
            onSelect={setFilter}
          />
        ))}
      </div>
    ),
    [usersByFilter, filter]
  );

  return (
    <PaginatedTable
      items={usersByFilter[filter]}
      pageResetKey={filter}
      renderRow={renderRow}
      getItemKey={getUserKey}
      searchFilter={searchFilter}
      toolbar={toolbar}
      headerColumns={
        <>
          <div>
            <span className="hidden md:inline">{t('usersAvatarCol')}</span>
          </div>
          <div>{t('usersUserCol')}</div>
          <div className="hidden md:block">{t('usersRolesCol')}</div>
          <div className="hidden md:block">{t('usersJoinedAtCol')}</div>
          <div className="hidden md:block">{t('usersLastJoinCol')}</div>
          <div>{t('usersStatusCol')}</div>
          <div>
            <span className="hidden md:inline">{t('usersActionsCol')}</span>
          </div>
        </>
      }
      gridCols={USERS_GRID_COLS}
      itemsPerPage={8}
      searchPlaceholder={t('searchUsersPlaceholder')}
      emptyMessage={t('noUsersFound')}
    />
  );
});

export { UsersTable };
