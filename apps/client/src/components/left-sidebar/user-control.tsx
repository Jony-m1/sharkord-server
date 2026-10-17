import { openServerScreen } from '@/features/server-screens/actions';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useChannelCan } from '@/features/server/hooks';
import {
  useIsUserAfk,
  useOwnPublicUser,
  useOwnUserId
} from '@/features/server/users/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { ChannelPermission, TestId, getTrpcError } from '@sharkord/shared';
import { Button } from '@sharkord/ui';
import {
  HeadphoneOff,
  Headphones,
  Mic,
  MicOff,
  Moon,
  Settings
} from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ServerScreen } from '../server-screens/screens';
import { UserAvatar } from '../user-avatar';
import { UserPopover } from '../user-popover';

const UserControl = memo(() => {
  const { t } = useTranslation('sidebar');
  const ownPublicUser = useOwnPublicUser();
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const { ownVoiceState, toggleMic, toggleSound } = useVoice();
  const channelCan = useChannelCan(currentVoiceChannelId);
  const ownUserId = useOwnUserId();
  const isAfk = useIsUserAfk(ownUserId ?? null);

  const handleAfkClick = useCallback(async () => {
    try {
      const trpc = getTRPCClient();

      await trpc.users.setAfk.mutate({ afk: !isAfk });
    } catch (error) {
      toast.error(getTrpcError(error, t('failedSetAfk')));
    }
  }, [isAfk, t]);

  const handleSettingsClick = useCallback(() => {
    openServerScreen(ServerScreen.USER_SETTINGS);
  }, []);

  let micTitle = ownVoiceState.micMuted ? t('unmuteMic') : t('muteMic');

  if (ownVoiceState.serverMuted) {
    micTitle = t('common:mutedByModerator');
  }

  if (!ownPublicUser) return null;

  return (
    <div className="flex items-center justify-between h-14 px-2 bg-muted/20 border-t border-border">
      <UserPopover userId={ownPublicUser.id}>
        <div className="flex items-center space-x-2 min-w-0 flex-1 cursor-pointer hover:bg-muted/30 rounded-md p-1 transition-colors">
          <UserAvatar
            userId={ownPublicUser.id}
            className="h-8 w-8 flex-shrink-0"
            showUserPopover={false}
          />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium text-foreground truncate">
              {ownPublicUser.name}
            </span>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-muted-foreground capitalize">
                {isAfk ? t('afk') : ownPublicUser.status}
              </span>
            </div>
          </div>
        </div>
      </UserPopover>

      <div className="flex items-center space-x-0.5">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 hover:bg-muted/50',
            isAfk
              ? 'text-yellow-500 hover:text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20'
              : 'text-muted-foreground hover:text-foreground'
          )}
          data-testid={TestId.AFK_TOGGLE}
          aria-pressed={isAfk}
          onClick={handleAfkClick}
          title={isAfk ? t('backFromAfk') : t('goAfk')}
        >
          <Moon className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 hover:bg-muted/50',
            ownVoiceState.micMuted
              ? 'text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={toggleMic}
          title={micTitle}
          disabled={
            !channelCan(ChannelPermission.SPEAK) ||
            ownVoiceState.soundMuted ||
            ownVoiceState.serverMuted
          }
        >
          {ownVoiceState.micMuted ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 hover:bg-muted/50',
            ownVoiceState.soundMuted
              ? 'text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={toggleSound}
          title={ownVoiceState.soundMuted ? t('undeafen') : t('deafen')}
        >
          {ownVoiceState.soundMuted ? (
            <HeadphoneOff className="h-4 w-4" />
          ) : (
            <Headphones className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          data-testid={TestId.USER_SETTINGS_TRIGGER}
          onClick={handleSettingsClick}
          title={t('userSettings')}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

export { UserControl };
