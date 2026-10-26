import { useStreamVolumeControl } from '@/components/voice-provider/hooks/use-stream-volume-control';
import {
  useChannelById,
  useCurrentVoiceChannelId
} from '@/features/server/channels/hooks';
import { useCallJoinedAt } from '@/features/server/voice/hooks';
import { formatTotalDuration } from '@/helpers/format-duration';
import { useSelectChannel } from '@/hooks/use-select-channel';
import { TestId } from '@sharkord/shared';
import { Button, IconButton, Slider } from '@sharkord/ui';
import { Volume2, VolumeX } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// the row counts whole minutes, so it only has to look at the clock now and then
const TICK_MS = 10_000;

type TProfileVolumeProps = {
  userId: number;
};

const ProfileVolume = memo(({ userId }: TProfileVolumeProps) => {
  const { t } = useTranslation('sidebar');
  const { volume, isMuted, setVolume, toggleMute } = useStreamVolumeControl({
    type: 'user',
    userId
  });

  const handleVolumeChange = useCallback(
    ([value]: number[]) => {
      setVolume(value ?? 0);
    },
    [setVolume]
  );

  return (
    <div className="flex items-center gap-2">
      <IconButton
        icon={isMuted ? VolumeX : Volume2}
        variant="ghost"
        size="sm"
        title={t('userVolume')}
        onClick={toggleMute}
      />
      <Slider
        value={[volume]}
        onValueChange={handleVolumeChange}
        min={0}
        max={100}
        step={1}
        aria-label={t('userVolume')}
      />
      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {volume}%
      </span>
    </div>
  );
});

type TProfileVoiceRowProps = {
  userId: number;
  channelId: number;
  isOwnUser: boolean;
  onJoin: () => void;
};

// where the person is talking right now, with a way in. a dm call is private to the two people
// in it, so it is never shown here
const ProfileVoiceRow = memo(
  ({ userId, channelId, isOwnUser, onJoin }: TProfileVoiceRowProps) => {
    const { t } = useTranslation('common');
    const channel = useChannelById(channelId);
    const joinedAt = useCallJoinedAt(channelId, userId);
    const currentVoiceChannelId = useCurrentVoiceChannelId();
    const selectChannel = useSelectChannel();
    const [now, setNow] = useState(Date.now);

    useEffect(() => {
      const interval = setInterval(() => setNow(Date.now()), TICK_MS);

      return () => clearInterval(interval);
    }, []);

    const handleJoin = useCallback(() => {
      selectChannel(channelId);
      onJoin();
    }, [selectChannel, channelId, onJoin]);

    if (!channel || channel.isDm) return null;

    const isInOurCall = currentVoiceChannelId === channelId;
    let label = t('inVoiceChannel', { channel: channel.name });

    if (joinedAt !== undefined) {
      label = t('inVoiceChannelFor', {
        channel: channel.name,
        duration: formatTotalDuration(now - joinedAt)
      });
    }

    return (
      <div
        data-testid={TestId.USER_POPOVER_VOICE}
        className="mt-3 space-y-2 rounded-md bg-muted/40 p-2"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-xs font-medium text-foreground">
            {label}
          </span>
          {!isInOurCall && (
            <Button
              data-testid={TestId.USER_POPOVER_JOIN}
              size="sm"
              variant="secondary"
              className="h-7 shrink-0"
              onClick={handleJoin}
            >
              {t('joinVoiceChannel')}
            </Button>
          )}
        </div>
        {isInOurCall && !isOwnUser && <ProfileVolume userId={userId} />}
      </div>
    );
  }
);

export { ProfileVoiceRow };
