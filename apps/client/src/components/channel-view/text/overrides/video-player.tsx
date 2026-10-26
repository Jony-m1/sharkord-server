import { cn } from '@sharkord/ui';
import { memo } from 'react';
import ReactPlayer from 'react-player';

type TVideoPlayerProps = {
  url: string;
  className?: string;
  light?: string;
  previewLabel?: string;
  onError?: () => void;
};

// with light, the picture stands in for the player until it is clicked, and only then does the
// player load. that click is the request to play, so the player starts on its own
const VideoPlayer = memo(
  ({ url, className, light, previewLabel, onError }: TVideoPlayerProps) => {
    return (
      <div className={cn('aspect-video w-150 max-w-full', className)}>
        <ReactPlayer
          src={url}
          controls
          light={light}
          previewAriaLabel={previewLabel}
          autoPlay={!!light}
          onError={onError}
          width="100%"
          height="100%"
          style={{
            colorScheme: 'dark'
          }}
        />
      </div>
    );
  }
);

export { VideoPlayer };
