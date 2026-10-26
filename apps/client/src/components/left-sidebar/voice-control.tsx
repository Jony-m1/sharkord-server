import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useCan, useChannelCan } from '@/features/server/hooks';
import { leaveVoice } from '@/features/server/voice/actions';
import { useVoice } from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import {
  ChannelPermission,
  Permission,
  PluginSlot,
  TestId
} from '@sharkord/shared';
import { Button } from '@sharkord/ui';
import {
  AlertTriangle,
  Loader2,
  Monitor,
  MonitorOff,
  PhoneOff,
  Video,
  VideoOff,
  Wifi
} from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalAudioStreams } from '../channel-view/voice/external-audio-streams';
import { VoiceAudioStreams } from '../channel-view/voice/voice-audio-streams';
import { PluginSlotRenderer } from '../plugin-slot-renderer';
import { CallTimer } from './call-timer';
import { StatsPopover } from './stats-popover';

const VoiceControl = memo(() => {
  const { t } = useTranslation('sidebar');
  const voiceChannelId = useCurrentVoiceChannelId();
  const can = useCan();
  const channelCan = useChannelCan(voiceChannelId);
  const {
    ownVoiceState,
    toggleWebcam,
    toggleScreenShare,
    connectionStatus,
    isScreenShareSupported
  } = useVoice();

  // this panel only shows while a call is set, and the status leaves disconnected only once the
  // join has answered, so disconnected here is a join still on its way rather than a lost call
  const connectionInfo = useMemo(() => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <Wifi className="h-4 w-4 text-green-600" />,
          text: t('voiceConnected'),
          color: 'text-green-600'
        };
      case 'failed':
        return {
          icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
          text: t('voiceFailed'),
          color: 'text-red-500'
        };
      case 'connecting':
      case 'disconnected':
      default:
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />,
          text: t('voiceConnecting'),
          color: 'text-yellow-500'
        };
    }
  }, [connectionStatus, t]);

  const handleLeaveVoice = useCallback(() => {
    leaveVoice({ reason: 'user_disconnect_button' });
  }, []);

  const pluginSlotProps = useMemo(
    () => (voiceChannelId ? { channelId: voiceChannelId } : undefined),
    [voiceChannelId]
  );

  // a public channel allows sharing to everyone, so without the server permission as well
  // the button would offer a share the server always refuses
  const canShareScreen =
    can(Permission.SHARE_SCREEN) && channelCan(ChannelPermission.SHARE_SCREEN);

  if (!voiceChannelId) {
    return null;
  }

  return (
    <>
      <VoiceAudioStreams channelId={voiceChannelId} />
      <ExternalAudioStreams channelId={voiceChannelId} />
      <div
        data-testid={TestId.VOICE_CONTROL}
        className="bg-secondary/30 border-t border-border"
      >
        <StatsPopover>
          <div className="flex items-center px-2 py-1.5 gap-2 bg-secondary/50 cursor-pointer hover:bg-secondary/60 transition-colors">
            {connectionInfo.icon}
            <span className={cn('text-xs font-medium', connectionInfo.color)}>
              {connectionInfo.text}
            </span>
            <CallTimer />
          </div>
        </StatsPopover>

        <div className="flex items-center justify-between px-2 py-2">
          <Button variant="outline" size="sm" onClick={handleLeaveVoice}>
            <PhoneOff className="h-3.5 w-3.5 mr-1.5" />
            {t('disconnectVoice')}
          </Button>

          <div className="flex gap-1">
            <PluginSlotRenderer
              slotId={PluginSlot.VOICE_CONTROLS}
              props={pluginSlotProps}
            />
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 rounded-md transition-all duration-200',
                ownVoiceState.webcamEnabled
                  ? 'bg-green-500/15 hover:bg-green-500/25 text-green-400 hover:text-green-300'
                  : 'bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground'
              )}
              onClick={toggleWebcam}
              title={
                ownVoiceState.webcamEnabled
                  ? t('turnOffCamera')
                  : t('turnOnCamera')
              }
              disabled={!channelCan(ChannelPermission.WEBCAM)}
            >
              {ownVoiceState.webcamEnabled ? (
                <Video className="h-4 w-4" />
              ) : (
                <VideoOff className="h-4 w-4" />
              )}
            </Button>

            {isScreenShareSupported && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 rounded-md transition-all duration-200',
                  ownVoiceState.sharingScreen
                    ? 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 hover:text-blue-300'
                    : 'bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground'
                )}
                onClick={toggleScreenShare}
                title={
                  ownVoiceState.sharingScreen
                    ? t('stopScreenShare')
                    : t('startScreenShare')
                }
                disabled={!canShareScreen}
              >
                {ownVoiceState.sharingScreen ? (
                  <Monitor className="h-4 w-4" />
                ) : (
                  <MonitorOff className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
});

export { VoiceControl };
