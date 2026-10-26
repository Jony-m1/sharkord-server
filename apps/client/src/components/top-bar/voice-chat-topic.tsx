import { useChannelById } from '@/features/server/channels/hooks';
import { TestId } from '@sharkord/shared';
import { memo } from 'react';

type TVoiceChatTopicProps = {
  channelId: number;
};

// only the topic: the channel's name is already in the list, the call and the message box
const VoiceChatTopic = memo(({ channelId }: TVoiceChatTopicProps) => {
  const channel = useChannelById(channelId);

  if (!channel?.topic) {
    return null;
  }

  return (
    <span
      className="truncate text-xs text-muted-foreground"
      data-testid={TestId.VOICE_CHAT_TOPIC}
    >
      {channel.topic}
    </span>
  );
});

export { VoiceChatTopic };
