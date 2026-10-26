import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { toggleChannelMuted } from '@/features/app/actions';
import { useIsChannelMuted } from '@/features/app/hooks';
import { PluginSlot } from '@sharkord/shared';
import { IconButton, Tooltip } from '@sharkord/ui';
import { BellOff } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PinnedMessagesPopover } from './pinned-messages-popover';

type TChannelHeaderActionsProps = {
  channelId: number;
};

// a channel's buttons, in its own header or, for a call's chat, in the top bar
const ChannelHeaderActions = memo(
  ({ channelId }: TChannelHeaderActionsProps) => {
    const { t } = useTranslation();
    const isMuted = useIsChannelMuted(channelId);

    const onUnmuteClick = useCallback(() => {
      toggleChannelMuted(channelId);
    }, [channelId]);

    const pluginProps = useMemo(() => ({ channelId }), [channelId]);

    return (
      <>
        <PluginSlotRenderer
          slotId={PluginSlot.CHANNEL_HEADER}
          props={pluginProps}
        />

        {isMuted && (
          <Tooltip content={t('channelMutedTooltip')}>
            <IconButton
              icon={BellOff}
              size="sm"
              variant="ghost"
              onClick={onUnmuteClick}
            />
          </Tooltip>
        )}
        <PinnedMessagesPopover channelId={channelId} />
      </>
    );
  }
);

export { ChannelHeaderActions };
