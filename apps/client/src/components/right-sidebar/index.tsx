import { AfkBadge } from '@/components/afk-badge';
import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { ResizableSidebar } from '@/components/resizable-sidebar';
import { UserAvatar } from '@/components/user-avatar';
import {
  useIsUserAfk,
  useOnlineUserIds,
  useUsers
} from '@/features/server/users/hooks';
import { LocalStorageKey } from '@/helpers/storage';
import { cn } from '@/lib/utils';
import {
  DELETED_USER_IDENTITY_AND_NAME,
  PluginSlot,
  TestId,
  type TJoinedPublicUser
} from '@sharkord/shared';
import { memo, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPopover } from '../user-popover';

const MAX_USERS_TO_SHOW = 100;
const MIN_WIDTH = 180;
const MAX_WIDTH = 360;
const DEFAULT_WIDTH = 240; // w-60 = 240px

type TUserProps = {
  userId: number;
  name: string;
  banned: boolean;
  online: boolean;
};

const User = memo(({ userId, name, banned, online }: TUserProps) => {
  const pluginProps = useMemo(() => ({ userId }), [userId]);
  const isAfk = useIsUserAfk(userId);

  return (
    <UserPopover userId={userId}>
      <div
        data-testid={TestId.MEMBER_ITEM}
        className={cn(
          'flex items-center gap-3 rounded px-2 py-1.5 hover:bg-accent select-none min-w-0',
          !online && 'opacity-50 hover:opacity-100'
        )}
      >
        <UserAvatar userId={userId} className="h-8 w-8 shrink-0" />
        <span
          className={cn(
            'text-sm text-foreground truncate',
            banned && 'line-through text-muted-foreground'
          )}
        >
          {name}
        </span>

        {isAfk && <AfkBadge />}

        <PluginSlotRenderer
          slotId={PluginSlot.MEMBER_LIST_ITEM}
          props={pluginProps}
        />
      </div>
    </UserPopover>
  );
});

type TMembersHeadingProps = {
  label: string;
};

const MembersHeading = memo(({ label }: TMembersHeadingProps) => (
  <h4 className="px-2 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
    {label}
  </h4>
));

type TRightSidebarProps = {
  className?: string;
  isOpen?: boolean;
};

const RightSidebar = memo(
  ({ className, isOpen = true }: TRightSidebarProps) => {
    const { t } = useTranslation('sidebar');
    const users = useUsers();
    const onlineUserIds = useOnlineUserIds();

    // the users come sorted online first, so the cap cuts from the offline end
    const members = useMemo(() => {
      const isOnline = ({ id }: TJoinedPublicUser) => onlineUserIds.has(id);
      const filtered = users.filter(
        (user) => user.name !== DELETED_USER_IDENTITY_AND_NAME
      );
      const shown = filtered.slice(0, MAX_USERS_TO_SHOW);
      const allOnline = filtered.filter(isOnline);
      const onlineCount = allOnline.length;

      return {
        online: shown.filter(isOnline),
        offline: shown.filter((user) => !isOnline(user)),
        onlineCount,
        offlineCount: filtered.length - onlineCount,
        totalCount: filtered.length,
        hiddenCount: filtered.length - shown.length
      };
    }, [users, onlineUserIds]);

    // one keyed list with the headings in it, not a list per section: a member who comes online
    // or goes offline moves to the other heading as the same row, so a profile card open on
    // them stays open
    const rows = useMemo(() => {
      const list: ReactNode[] = [];

      if (members.online.length > 0) {
        list.push(
          <MembersHeading
            key="online"
            label={t('membersOnline', { count: members.onlineCount })}
          />
        );
      }

      for (const user of members.online) {
        list.push(
          <User
            key={user.id}
            userId={user.id}
            name={user.name}
            banned={user.banned}
            online
          />
        );
      }

      if (members.offline.length > 0) {
        list.push(
          <MembersHeading
            key="offline"
            label={t('membersOffline', { count: members.offlineCount })}
          />
        );
      }

      for (const user of members.offline) {
        list.push(
          <User
            key={user.id}
            userId={user.id}
            name={user.name}
            banned={user.banned}
            online={false}
          />
        );
      }

      return list;
    }, [members, t]);

    return (
      <ResizableSidebar
        storageKey={LocalStorageKey.RIGHT_SIDEBAR_WIDTH}
        minWidth={MIN_WIDTH}
        maxWidth={MAX_WIDTH}
        defaultWidth={DEFAULT_WIDTH}
        edge="left"
        isOpen={isOpen}
        className={cn('h-full', className)}
        data-testid={TestId.MEMBERS_SIDEBAR}
      >
        <div className="flex h-12 items-center border-b border-border px-4">
          <h3 className="text-sm font-semibold text-foreground">
            {t('membersHeader', { count: members.totalCount })}
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 pt-0">
          <div className="space-y-1">{rows}</div>
          {members.hiddenCount > 0 && (
            <div className="text-sm text-muted-foreground px-2 py-1.5">
              {t('moreMembers', { count: members.hiddenCount })}
            </div>
          )}
        </div>
      </ResizableSidebar>
    );
  }
);

export { RightSidebar };
