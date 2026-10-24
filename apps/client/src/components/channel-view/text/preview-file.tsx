import { FullScreenImage } from '@/components/fullscreen-image/content';
import type { TStagedFile } from '@/hooks/use-staged-files';
import { FileCategory, getFileCategory } from '@sharkord/shared';
import { Button } from '@sharkord/ui';
import { filesize } from 'filesize';
import {
  File,
  FileImage,
  FileMusic,
  FileText,
  FileVideo,
  Trash
} from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { VideoPlayer } from './overrides/video-player';

const categoryIconMap: Record<FileCategory, React.ElementType> = {
  [FileCategory.AUDIO]: FileMusic,
  [FileCategory.IMAGE]: FileImage,
  [FileCategory.VIDEO]: FileVideo,
  [FileCategory.DOCUMENT]: FileText,
  [FileCategory.OTHER]: File
};

type TPreviewFileProps = {
  item: TStagedFile;
  onRemove?: () => void;
};

const PreviewFile = memo(({ item, onRemove }: TPreviewFileProps) => {
  const { name, size, extension, previewUrl } = item;

  const category = useMemo(() => getFileCategory(extension), [extension]);
  const isImage = category === FileCategory.IMAGE;
  const isVideo = category === FileCategory.VIDEO;

  const onRemoveClick = useCallback(
    (e: React.MouseEvent) => {
      if (onRemove) {
        e.preventDefault();
        e.stopPropagation();
        onRemove();
      }
    },
    [onRemove]
  );

  const [previewError, setPreviewError] = useState(false);

  const onPreviewError = useCallback(() => {
    setPreviewError(true);
  }, []);

  const hasPreview = !!previewUrl && !previewError && (isImage || isVideo);
  const Icon = categoryIconMap[category] || File;

  return (
    <div className="group relative flex w-48 flex-col overflow-hidden rounded-lg border border-border bg-background transition-all duration-200 hover:border-primary/50 hover:shadow-md">
      <div className="relative h-32">
        {hasPreview ? (
          <>
            {isImage && (
              <FullScreenImage
                src={previewUrl}
                alt={name}
                className="h-full w-full object-cover"
                onError={onPreviewError}
              />
            )}
            {isVideo && (
              <VideoPlayer
                url={previewUrl}
                className="h-full w-full aspect-auto"
              />
            )}
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted/50">
            <Icon className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-1 px-2 py-1.5">
        <div className="flex flex-col overflow-hidden">
          <span
            className="truncate text-xs font-medium text-foreground"
            title={name}
          >
            {name}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {filesize(size)}
          </span>
        </div>
      </div>

      {onRemove && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute top-1 right-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={onRemoveClick}
        >
          <Trash className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
});

export { PreviewFile };
