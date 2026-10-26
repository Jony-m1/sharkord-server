import { useModerationActions } from '@/components/mod-view-sheet/hooks/use-moderation-actions';
import { useCan, useVoiceMoveTargetsByUserId } from '@/features/server/hooks';
import { useRoles } from '@/features/server/roles/hooks';
import { useUserStatus } from '@/features/server/users/hooks';
import { useVoiceUserState } from '@/features/server/voice/hooks';
import { Permission, TestId, UserStatus, type TRole } from '@sharkord/shared';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  IconButton
} from '@sharkord/ui';
import {
  Gavel,
  MicOff,
  MoreHorizontal,
  PhoneOff,
  Shield,
  UserMinus,
  Volume2
} from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TRoleItemProps = {
  role: Pick<TRole, 'id' | 'name' | 'color'>;
  checked: boolean;
  onAdd: (roleId: number) => void;
  onRemove: (roleId: number, roleName: string) => void;
};

const RoleItem = memo(({ role, checked, onAdd, onRemove }: TRoleItemProps) => {
  const handleCheckedChange = useCallback(
    (next: boolean) => {
      if (next) {
        onAdd(role.id);

        return;
      }

      onRemove(role.id, role.name);
    },
    [role.id, role.name, onAdd, onRemove]
  );

  return (
    <DropdownMenuCheckboxItem
      checked={checked}
      onCheckedChange={handleCheckedChange}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: role.color }}
      />
      <span className="truncate">{role.name}</span>
    </DropdownMenuCheckboxItem>
  );
});

type TMoveTargetItemProps = {
  channelId: number;
  name: string;
  onMove: (channelId: number) => void;
};

const MoveTargetItem = memo(
  ({ channelId, name, onMove }: TMoveTargetItemProps) => {
    const handleSelect = useCallback(() => {
      onMove(channelId);
    }, [onMove, channelId]);

    return (
      <DropdownMenuItem onSelect={handleSelect}>
        <Volume2 className="h-4 w-4" />
        <span className="truncate">{name}</span>
      </DropdownMenuItem>
    );
  }
);

type TProfileModerationMenuProps = {
  userId: number;
  roleIds: number[];
  banned: boolean;
  isDeleted: boolean;
  voiceChannelId: number | undefined;
};

// quick actions on someone else's card. each one is gated by the permission its route checks,
// so nobody is offered something the server will refuse
const ProfileModerationMenu = memo(
  ({
    userId,
    roleIds,
    banned,
    isDeleted,
    voiceChannelId
  }: TProfileModerationMenuProps) => {
    const { t } = useTranslation('common');
    const can = useCan();
    const roles = useRoles();
    const status = useUserStatus(userId);
    const moveTargets = useVoiceMoveTargetsByUserId(userId);
    const voiceState = useVoiceUserState(voiceChannelId ?? -1, userId);
    const {
      kick,
      ban,
      unban,
      addRole,
      removeRole,
      moveTo,
      disconnect,
      setServerMute
    } = useModerationActions({ userId, isDeleted });

    const canManageUsers = can(Permission.MANAGE_USERS);
    const canMoveMembers = can(Permission.MOVE_MEMBERS);
    // the card only hands over a server voice channel this client can see, never a dm call
    const showVoiceActions = canMoveMembers && voiceChannelId !== undefined;
    const serverMuted = voiceState?.serverMuted ?? false;

    const handleToggleServerMute = useCallback(() => {
      setServerMute(!serverMuted);
    }, [setServerMute, serverMuted]);

    // the deleted user placeholder only holds what someone left behind, there is nobody to act on
    if (isDeleted || (!canManageUsers && !showVoiceActions)) return null;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton
            data-testid={TestId.USER_POPOVER_MENU}
            icon={MoreHorizontal}
            variant="ghost"
            size="sm"
            title={t('moreActions')}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {canManageUsers && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Shield className="h-4 w-4" />
                {t('rolesMenu')}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                {roles.map((role) => (
                  <RoleItem
                    key={role.id}
                    role={role}
                    checked={roleIds.includes(role.id)}
                    onAdd={addRole}
                    onRemove={removeRole}
                  />
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          {showVoiceActions && (
            <>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Volume2 className="h-4 w-4" />
                  {t('moveToMenu')}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                  {moveTargets.map((channel) => (
                    <MoveTargetItem
                      key={channel.id}
                      channelId={channel.id}
                      name={channel.name}
                      onMove={moveTo}
                    />
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem
                data-testid={TestId.USER_POPOVER_SERVER_MUTE}
                onSelect={handleToggleServerMute}
              >
                <MicOff className="h-4 w-4" />
                {serverMuted ? t('removeServerMute') : t('serverMute')}
              </DropdownMenuItem>
              <DropdownMenuItem
                data-testid={TestId.USER_POPOVER_DISCONNECT}
                onSelect={disconnect}
              >
                <PhoneOff className="h-4 w-4" />
                {t('disconnectFromVoice')}
              </DropdownMenuItem>
            </>
          )}

          {canManageUsers && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={kick}
                disabled={status === UserStatus.OFFLINE}
              >
                <UserMinus className="h-4 w-4" />
                {t('settings:kickBtn')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={banned ? unban : ban}
                className="text-destructive focus:text-destructive"
              >
                <Gavel className="h-4 w-4" />
                {banned ? t('settings:unbanBtn') : t('settings:banBtn')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

export { ProfileModerationMenu };
