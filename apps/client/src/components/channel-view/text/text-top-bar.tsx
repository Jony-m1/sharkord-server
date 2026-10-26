import { MobileBackButton } from '@/components/mobile-back-button';
import { UserAvatar } from '@/components/user-avatar';
import { useChannelById } from '@/features/server/channels/hooks';
import { useDirectMessageUserId } from '@/features/server/dms/hooks';
import { useUserById } from '@/features/server/users/hooks';
import { ChannelType } from '@sharkord/shared';
import { Hash, MessageCircleMore, Volume2 } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { ChannelHeaderActions } from './channel-header-actions';

type TTextTopbarProps = {
  channelId: number;
};

const TextTopbar = memo(({ channelId }: TTextTopbarProps) => {
  const channel = useChannelById(channelId);
  const dmUserId = useDirectMessageUserId(channelId);
  const dmUser = useUserById(dmUserId ?? null);

  // a direct message is named after the person it is with, as on Discord
  const info = useMemo(() => {
    if (channel?.isDm) {
      return {
        name: dmUser?.name,
        topic: undefined
      };
    }

    return {
      name: channel?.name,
      topic: channel?.topic
    };
  }, [channel, dmUser]);

  const getIcon = useCallback(() => {
    if (channel?.isDm && dmUserId !== undefined) {
      return <UserAvatar userId={dmUserId} className="h-6 w-6" />;
    }

    if (channel?.isDm) {
      return (
        <MessageCircleMore className="inline-block text-muted-foreground h-4 w-4" />
      );
    }

    if (channel?.type === ChannelType.TEXT) {
      return <Hash className="inline-block text-muted-foreground h-4 w-4" />;
    }

    if (channel?.type === ChannelType.VOICE) {
      return <Volume2 className="inline-block text-muted-foreground h-4 w-4" />;
    }

    return null;
  }, [channel, dmUserId]);

  return (
    <div className="flex h-12 border-b border-border bg-card w-auto overflow-hidden">
      <div className="flex w-full items-center justify-between px-4">
        <div className="flex items-center gap-2 min-w-0">
          <MobileBackButton />
          {getIcon()}
          <span className="font-bold truncate md:max-w-40">{info.name}</span>
          {info.topic && (
            <span className="hidden md:inline text-xs text-muted-foreground truncate">
              {info.topic}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ChannelHeaderActions channelId={channelId} />
        </div>
      </div>
    </div>
  );
});

export { TextTopbar };
