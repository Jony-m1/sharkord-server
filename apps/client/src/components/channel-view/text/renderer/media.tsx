import { memo, useMemo } from 'react';
import { AudioOverride } from '../overrides/audio';
import { ImageOverride } from '../overrides/image';
import { MediaOverride } from '../overrides/media';
import { VideoOverride } from '../overrides/video';
import type { TFoundMedia } from '../renderer/types';

type TMediaProps = {
  media: TFoundMedia[];
  onRemoveFile?: (fileId: number) => void;
  onMediaError?: (url: string) => void;
};

const Media = memo(({ media, onRemoveFile, onMediaError }: TMediaProps) => {
  const { imagesAndVideos, audios } = useMemo(() => {
    const imagesAndVideos = media.filter(
      (item) => item.type === 'image' || item.type === 'video'
    );
    const audios = media.filter((item) => item.type === 'audio');

    return {
      imagesAndVideos,
      audios
    };
  }, [media]);

  const singleVisualMedia =
    imagesAndVideos.length === 1 ? imagesAndVideos[0] : null;
  const hasOnlySingleVisualMedia =
    singleVisualMedia !== null && audios.length === 0;

  return (
    <>
      {hasOnlySingleVisualMedia && singleVisualMedia.type === 'image' && (
        <ImageOverride
          src={singleVisualMedia.url}
          fileId={singleVisualMedia.fileId}
          onRemoveFile={onRemoveFile}
          onMediaError={onMediaError}
        />
      )}

      {hasOnlySingleVisualMedia && singleVisualMedia.type === 'video' && (
        <VideoOverride
          src={singleVisualMedia.url}
          fileId={singleVisualMedia.fileId}
          onRemoveFile={onRemoveFile}
          onMediaError={onMediaError}
        />
      )}

      {!hasOnlySingleVisualMedia && imagesAndVideos.length > 0 && (
        <MediaOverride
          media={imagesAndVideos}
          onRemoveFile={onRemoveFile}
          onMediaError={onMediaError}
        />
      )}

      {audios.map((media) => (
        <AudioOverride src={media.url} key={media.key} />
      ))}
    </>
  );
});

export { Media };
