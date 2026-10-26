import { memo, useCallback } from 'react';
import { OverrideLayout } from './layout';
import { MediaRemoveButton } from './media-remove-button';
import { VideoPlayer } from './video-player';

type TVideoOverrideProps = {
  src: string;
  fileId?: number;
  onRemoveFile?: (fileId: number) => void;
  onMediaError?: (url: string) => void;
};

const VideoOverride = memo(
  ({ src, fileId, onRemoveFile, onMediaError }: TVideoOverrideProps) => {
    const onError = useCallback(() => {
      onMediaError?.(src);
    }, [onMediaError, src]);

    return (
      <OverrideLayout>
        <div className="group/media relative w-fit max-w-full">
          <VideoPlayer url={src} className="max-h-75" onError={onError} />

          {fileId !== undefined && onRemoveFile && (
            <MediaRemoveButton fileId={fileId} onRemoveFile={onRemoveFile} />
          )}
        </div>
      </OverrideLayout>
    );
  }
);

export { VideoOverride };
