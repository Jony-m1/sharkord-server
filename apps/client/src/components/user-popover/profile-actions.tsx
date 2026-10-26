import { setModViewOpen, setSelectedDmChannelId } from '@/features/app/actions';
import { openServerScreen } from '@/features/server-screens/actions';
import { setDmsOpen } from '@/features/server/actions';
import { usePublicServerSettings } from '@/features/server/hooks';
import { useIsUserAfk } from '@/features/server/users/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { getTrpcError, Permission, TestId } from '@sharkord/shared';
import { Button, IconButton } from '@sharkord/ui';
import { MessageSquare, Moon, Pencil, UserCog } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Protect } from '../protect';
import { ServerScreen } from '../server-screens/screens';
import { ProfileModerationMenu } from './profile-moderation-menu';

type TOwnProfileActionsProps = {
  userId: number;
  onClose: () => void;
};

// your own card is where Discord puts editing and your status, never moderation of yourself
const OwnProfileActions = memo(
  ({ userId, onClose }: TOwnProfileActionsProps) => {
    const { t } = useTranslation('common');
    const isAfk = useIsUserAfk(userId);

    const handleEditProfile = useCallback(() => {
      onClose();
      openServerScreen(ServerScreen.USER_SETTINGS);
    }, [onClose]);

    const handleAfkClick = useCallback(async () => {
      try {
        const trpc = getTRPCClient();

        await trpc.users.setAfk.mutate({ afk: !isAfk });
      } catch (error) {
        toast.error(getTrpcError(error, t('sidebar:failedSetAfk')));
      }
    }, [isAfk, t]);

    return (
      <div className="flex gap-2">
        <Button
          data-testid={TestId.USER_POPOVER_EDIT_PROFILE}
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={handleEditProfile}
        >
          <Pencil className="h-4 w-4" />
          {t('editProfile')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          aria-pressed={isAfk}
          className={cn(isAfk && 'text-yellow-500')}
          onClick={handleAfkClick}
        >
          <Moon className="h-4 w-4" />
          {isAfk ? t('backFromAfkShort') : t('goAfkShort')}
        </Button>
      </div>
    );
  }
);

type TOtherProfileActionsProps = {
  userId: number;
  roleIds: number[];
  banned: boolean;
  isDeleted: boolean;
  voiceChannelId: number | undefined;
  onClose: () => void;
};

const OtherProfileActions = memo(
  ({
    userId,
    roleIds,
    banned,
    isDeleted,
    voiceChannelId,
    onClose
  }: TOtherProfileActionsProps) => {
    const { t } = useTranslation('common');
    const settings = usePublicServerSettings();
    const showDmButton = settings?.directMessagesEnabled && !isDeleted;

    const handleDirectMessage = useCallback(async () => {
      try {
        const trpc = getTRPCClient();
        const result = await trpc.dms.open.mutate({ userId });

        setDmsOpen(true);
        setSelectedDmChannelId(result.channelId);
        // on a phone the card is a modal sheet that would keep covering the dm it just opened
        onClose();
      } catch (error) {
        toast.error(getTrpcError(error, t('couldNotOpenDM')));
      }
    }, [userId, onClose, t]);

    const handleModerate = useCallback(() => {
      onClose();
      setModViewOpen(true, userId);
    }, [onClose, userId]);

    return (
      <div className="flex items-center gap-2">
        {showDmButton && (
          <Button
            data-testid={TestId.USER_POPOVER_DM}
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={handleDirectMessage}
          >
            <MessageSquare className="h-4 w-4" />
            {t('sendMessage')}
          </Button>
        )}

        <Protect permission={Permission.MANAGE_USERS}>
          <IconButton
            data-testid={TestId.USER_POPOVER_MODERATE}
            icon={UserCog}
            variant="ghost"
            size="sm"
            title={t('moderationView')}
            onClick={handleModerate}
          />
        </Protect>

        <ProfileModerationMenu
          userId={userId}
          roleIds={roleIds}
          banned={banned}
          isDeleted={isDeleted}
          voiceChannelId={voiceChannelId}
        />
      </div>
    );
  }
);

export { OtherProfileActions, OwnProfileActions };
