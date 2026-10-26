import { UserAvatar } from '@/components/user-avatar';
import { setModViewOpen } from '@/features/app/actions';
import { openDialog } from '@/features/dialogs/actions';
import { useUserRoles } from '@/features/server/hooks';
import { useOwnUserId, useUserStatus } from '@/features/server/users/hooks';
import {
  DELETED_USER_IDENTITY_AND_NAME,
  TestId,
  UserStatus
} from '@sharkord/shared';
import { Button } from '@sharkord/ui';
import { Gavel, Plus, Trash, UserMinus } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../dialogs/dialogs';
import { RoleBadge } from '../role-badge';
import { useModViewContext } from './context';
import { useModerationActions } from './hooks/use-moderation-actions';

const closeModView = () => setModViewOpen(false);

const Header = memo(() => {
  const { t } = useTranslation('settings');
  const ownUserId = useOwnUserId();
  const { user, refetch } = useModViewContext();
  const status = useUserStatus(user.id);
  const userRoles = useUserRoles(user.id);
  const isDeletedUser = user.identity === DELETED_USER_IDENTITY_AND_NAME;
  const isOwnUser = user.id === ownUserId;
  const { kick, ban, unban, removeRole } = useModerationActions({
    userId: user.id,
    isDeleted: isDeletedUser,
    onChange: refetch
  });

  const handleDeleteClick = useCallback(() => {
    openDialog(Dialog.DELETE_USER, {
      user,
      refetch,
      onDelete: closeModView
    });
  }, [user, refetch]);

  const handleAssignRoleClick = useCallback(() => {
    openDialog(Dialog.ASSIGN_ROLE, { user, refetch });
  }, [user, refetch]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <UserAvatar userId={user.id} className="h-12 w-12" />
        <h2 className="text-lg font-bold text-foreground">{user.name}</h2>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button
          data-testid={TestId.MOD_VIEW_KICK}
          variant="outline"
          size="sm"
          onClick={kick}
          disabled={status === UserStatus.OFFLINE}
        >
          <UserMinus className="h-4 w-4" />
          {t('kickBtn')}
        </Button>
        <Button
          data-testid={TestId.MOD_VIEW_BAN}
          variant="outline"
          size="sm"
          onClick={user.banned ? unban : ban}
          disabled={isOwnUser || isDeletedUser}
        >
          <Gavel className="h-4 w-4" />
          {user.banned ? t('unbanBtn') : t('banBtn')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeleteClick}
          disabled={isOwnUser || isDeletedUser}
        >
          <Trash className="h-4 w-4" />
          {t('deleteBtn')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        {userRoles.map((role) => (
          <RoleBadge key={role.id} role={role} onRemoveRole={removeRole} />
        ))}
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs"
          disabled={isDeletedUser}
          onClick={handleAssignRoleClick}
        >
          <Plus className="h-3 w-3" />
          {t('modViewAssignRoleBtn')}
        </Button>
      </div>
    </div>
  );
});

export { Header };
