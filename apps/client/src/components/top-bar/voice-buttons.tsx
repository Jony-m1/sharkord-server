import { memo } from 'react';
import { VoiceOptionsController } from './voice-options-controller';
import { VolumeController } from './volume-controller';

type TVoiceButtonsProps = {
  currentVoiceChannelId: number;
};

const VoiceButtons = memo(({ currentVoiceChannelId }: TVoiceButtonsProps) => (
  <>
    <VoiceOptionsController />
    <VolumeController channelId={currentVoiceChannelId} />
  </>
));

export { VoiceButtons };
