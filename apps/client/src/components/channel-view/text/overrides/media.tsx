import { FullScreenImage } from '@/components/fullscreen-image/content';
import { memo, useCallback, useMemo } from 'react';
import Masonry from 'react-masonry-css';
import type { TFoundMedia } from '../renderer/types';
import { OverrideLayout } from './layout';
import { MediaRemoveButton } from './media-remove-button';
import { VideoPlayer } from './video-player';

type TMediaGridItemProps = {
  item: TFoundMedia;
  onRemoveFile?: (fileId: number) => void;
  onMediaError?: (url: string) => void;
};

const MediaGridItem = memo(
  ({ item, onRemoveFile, onMediaError }: TMediaGridItemProps) => {
    const onError = useCallback(() => {
      onMediaError?.(item.url);
    }, [onMediaError, item.url]);

    if (item.type !== 'image' && item.type !== 'video') return null;

    return (
      <div className="media-masonry-item group/media relative">
        {item.type === 'image' && (
          <FullScreenImage
            src={item.url}
            alt={`Media item ${item.key}`}
            crossOrigin="anonymous"
            className="media-masonry-asset media-masonry-image"
            onError={onError}
          />
        )}

        {item.type === 'video' && (
          <VideoPlayer
            url={item.url}
            className="media-masonry-video"
            onError={onError}
          />
        )}

        {item.fileId !== undefined && onRemoveFile && (
          <MediaRemoveButton fileId={item.fileId} onRemoveFile={onRemoveFile} />
        )}
      </div>
    );
  }
);

type TMediaOverrideProps = {
  media: TFoundMedia[];
  onRemoveFile?: (fileId: number) => void;
  onMediaError?: (url: string) => void;
};

const MediaOverride = memo(
  ({ media, onRemoveFile, onMediaError }: TMediaOverrideProps) => {
    const breakpointCols = useMemo(() => {
      const columnCount = Math.min(Math.max(media.length, 1), 4);

      return {
        default: columnCount,
        1400: Math.min(columnCount, 4),
        1100: Math.min(columnCount, 3),
        700: Math.min(columnCount, 2),
        520: 1
      };
    }, [media.length]);

    return (
      <OverrideLayout>
        <Masonry
          breakpointCols={breakpointCols}
          className="media-masonry-grid"
          columnClassName="media-masonry-grid_column"
        >
          {media.map((item) => (
            <MediaGridItem
              key={item.key}
              item={item}
              onRemoveFile={onRemoveFile}
              onMediaError={onMediaError}
            />
          ))}
        </Masonry>
      </OverrideLayout>
    );
  }
);

export { MediaOverride };
