import { Dialog } from '@/components/dialogs/dialogs';
import { useModerationActions } from '@/components/mod-view-sheet/hooks/use-moderation-actions';
import { RoleBadge } from '@/components/role-badge';
import { UserAvatar } from '@/components/user-avatar';
import { setModViewOpen } from '@/features/app/actions';
import { openDialog } from '@/features/dialogs/actions';
import type { TAdminUser } from '@/features/server/admin/hooks';
import { useUserRoles } from '@/features/server/hooks';
import {
  useIsUserBanned,
  useOwnUserId,
  useUserStatus,
  useUserStatusLabel
} from '@/features/server/users/hooks';
import { useDateLocale } from '@/hooks/use-date-locale';
import { cn } from '@/lib/utils';
import { TestId, UserStatus } from '@sharkord/shared';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip
} from '@sharkord/ui';
import { format, formatDistanceToNow } from 'date-fns';
import { Gavel, MoreVertical, Trash2, UserCog } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { USERS_GRID_COLS } from './grid';

// the row opens the moderation view on a click, but its menu is a click inside it too, portal
// or not, since react bubbles through portals
const stopPropagation = (event: React.MouseEvent) => {
  event.stopPropagation();
};

type TBannedBadgeProps = {
  user: TAdminUser;
};

const BannedBadge = memo(({ user }: TBannedBadgeProps) => {
  const { t } = useTranslation('settings');
  const dateLocale = useDateLocale();

  let tooltip = user.banReason || t('noReasonProvidedDetail');

  if (user.bannedAt) {
    tooltip = t('bannedTooltip', {
      date: format(user.bannedAt, 'PPP', { locale: dateLocale }),
      reason: tooltip
    });
  }

  return (
    <Tooltip content={tooltip}>
      <Badge variant="destructive" className="shrink-0">
        <Gavel />
        {t('common:bannedBadge')}
      </Badge>
    </Tooltip>
  );
});

type TTableUserProps = {
  user: TAdminUser;
  refetch?: () => void;
};

const TableUser = memo(({ user, refetch }: TTableUserProps) => {
  const { t } = useTranslation('settings');
  const dateLocale = useDateLocale();
  const roles = useUserRoles(user.id);
  const status = useUserStatus(user.id);
  const statusLabel = useUserStatusLabel(user.id);
  const ownUserId = useOwnUserId();
  // the rows are fetched once, but a ban from the moderation view a row opens lands in the store
  const banned = useIsUserBanned(user.id);
  const { unban } = useModerationActions({
    userId: user.id,
    isDeleted: false,
    onChange: refetch
  });

  const onModerateClick = useCallback(() => {
    setModViewOpen(true, user.id);
  }, [user.id]);

  const onDeleteClick = useCallback(() => {
    openDialog(Dialog.DELETE_USER, { user, refetch });
  }, [user, refetch]);

  const roleBadges = roles.map((role) => (
    <RoleBadge key={role.id} role={role} />
  ));

  return (
    <div
      data-testid={TestId.USERS_TABLE_ROW}
      className={cn(
        'grid cursor-pointer gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/30',
        USERS_GRID_COLS
      )}
      onClick={onModerateClick}
    >
      <div className="flex items-center justify-center">
        <UserAvatar userId={user.id} className="h-8 w-8 flex-shrink-0" />
      </div>

      <div className="flex min-w-0 flex-col justify-center gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-foreground">
            {user.name}
          </span>
          {banned && <BannedBadge user={user} />}
        </div>
        {user.bio && (
          <div className="hidden truncate text-xs text-muted-foreground md:block">
            {user.bio}
          </div>
        )}
        {roles.length > 0 && (
          <div className="flex flex-wrap gap-1 md:hidden">{roleBadges}</div>
        )}
      </div>

      <div className="hidden min-w-0 flex-wrap content-center items-center gap-1 md:flex">
        {roleBadges}
      </div>

      <div className="hidden items-center text-muted-foreground md:flex">
        <span
          className="text-xs"
          title={format(user.createdAt, 'PPP p', { locale: dateLocale })}
        >
          {formatDistanceToNow(user.createdAt, {
            addSuffix: true,
            locale: dateLocale
          })}
        </span>
      </div>

      <div className="hidden items-center text-muted-foreground md:flex">
        <span className="text-xs">
          {formatDistanceToNow(user.lastLoginAt, {
            addSuffix: true,
            locale: dateLocale
          })}
        </span>
      </div>

      <div className="flex min-w-0 items-center text-muted-foreground">
        <span
          className={cn('truncate text-xs', {
            'text-green-500': status === UserStatus.ONLINE,
            'text-yellow-500': status === UserStatus.IDLE
          })}
        >
          {statusLabel}
        </span>
      </div>

      <div
        className="flex items-center justify-center"
        onClick={stopPropagation}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title={t('usersActionsCol')}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onModerateClick}>
              <UserCog className="h-4 w-4" />
              {t('moderateUserAction')}
            </DropdownMenuItem>
            {banned && (
              <DropdownMenuItem onClick={unban}>
                <Gavel className="h-4 w-4" />
                {t('unbanBtn')}
              </DropdownMenuItem>
            )}
            {ownUserId !== user.id && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDeleteClick}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  {t('deleteUserAction', { defaultValue: t('deleteBtn') })}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

export { TableUser };
