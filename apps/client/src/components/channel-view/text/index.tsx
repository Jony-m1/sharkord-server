import { memo, useCallback } from 'react';
import { Conversation } from './conversation';
import { TextTopbar } from './text-top-bar';

type TChannelProps = {
  channelId: number;
};

const TextChannel = memo(({ channelId }: TChannelProps) => {
  const renderHeader = useCallback(
    () => <TextTopbar channelId={channelId} />,
    [channelId]
  );

  return <Conversation channelId={channelId} renderHeader={renderHeader} />;
});

export { TextChannel };
