import { FullScreenImage } from '@/components/fullscreen-image/content';
import { cn } from '@/lib/utils';
import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { OverrideLayout } from './layout';
import { MediaRemoveButton } from './media-remove-button';

type TImageOverrideProps = {
  src: string;
  alt?: string;
  title?: string;
  fileId?: number;
  onRemoveFile?: (fileId: number) => void;
  onMediaError?: (url: string) => void;
};

const ImageOverride = memo(
  ({ src, alt, fileId, onRemoveFile, onMediaError }: TImageOverrideProps) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    // a picture the page has shown before is ready as soon as the element exists, so it
    // shows in the first frame instead of blinking out on every channel switch
    useLayoutEffect(() => {
      const image = wrapperRef.current?.querySelector('img');

      if (image?.complete && image.naturalWidth > 0) {
        setLoaded(true);
      }
    }, []);

    const onLoad = useCallback(() => {
      setLoaded(true);
    }, []);

    const onError = useCallback(() => {
      setError(true);
      onMediaError?.(src);
    }, [onMediaError, src]);

    if (error) return null;

    return (
      <OverrideLayout>
        <div ref={wrapperRef} className="group/media relative w-fit max-w-full">
          <FullScreenImage
            src={src}
            alt={alt}
            onLoad={onLoad}
            onError={onError}
            className={cn(
              'max-w-full max-h-75 object-contain object-left w-fit',
              !loaded && 'opacity-0'
            )}
            crossOrigin="anonymous"
          />

          {fileId !== undefined && onRemoveFile && (
            <MediaRemoveButton fileId={fileId} onRemoveFile={onRemoveFile} />
          )}
        </div>
      </OverrideLayout>
    );
  }
);

export { ImageOverride };
