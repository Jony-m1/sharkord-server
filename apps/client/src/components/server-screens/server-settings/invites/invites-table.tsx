import { PaginatedTable } from '@/components/paginated-table';
import type { TJoinedInvite } from '@sharkord/shared';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TableInvite } from './table-invite';

const getInviteKey = (invite: TJoinedInvite) => invite.id;

type TInvitesTableProps = {
  invites: TJoinedInvite[];
  refetch: () => void;
};

const InvitesTable = memo(({ invites, refetch }: TInvitesTableProps) => {
  const { t } = useTranslation('settings');
  const searchFilter = useCallback(
    (invite: TJoinedInvite, searchTerm: string) => {
      const query = searchTerm.toLowerCase();

      return (
        invite.code.toLowerCase().includes(query) ||
        invite.creator.name.toLowerCase().includes(query)
      );
    },
    []
  );

  const renderRow = useCallback(
    (invite: TJoinedInvite) => (
      <TableInvite invite={invite} refetch={refetch} />
    ),
    [refetch]
  );

  return (
    <PaginatedTable
      items={invites}
      renderRow={renderRow}
      getItemKey={getInviteKey}
      searchFilter={searchFilter}
      headerColumns={
        <>
          <div>{t('invitesCodeCol')}</div>
          <div>{t('invitesRoleCol')}</div>
          <div>{t('invitesCreatorCol')}</div>
          <div>{t('invitesUsesCol')}</div>
          <div>{t('invitesExpiresCol')}</div>
          <div>{t('invitesCreatedCol')}</div>
          <div>{t('invitesStatusCol')}</div>
          <div>{t('invitesActionsCol')}</div>
        </>
      }
      gridCols="grid-cols-[1fr_80px_50px_70px_90px_110px_70px_60px]"
      itemsPerPage={8}
      searchPlaceholder={t('searchInvitesPlaceholder')}
      emptyMessage={t('noInvitesFound')}
    />
  );
});

export { InvitesTable };
