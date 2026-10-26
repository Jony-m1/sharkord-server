import { TestId } from '@sharkord/shared';
import { IconButton } from '@sharkord/ui';
import { Trash } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TMediaRemoveButtonProps = {
  fileId: number;
  onRemoveFile: (fileId: number) => void;
};

// the owner's way to delete an attachment that shows as a picture or a video, which has no
// card of its own. the media around it carries group/media; a touch screen has no hover, so
// there it always shows
const MediaRemoveButton = memo(
  ({ fileId, onRemoveFile }: TMediaRemoveButtonProps) => {
    const { t } = useTranslation('common');

    const handleClick = useCallback(() => {
      onRemoveFile(fileId);
    }, [onRemoveFile, fileId]);

    return (
      <IconButton
        icon={Trash}
        size="sm"
        variant="destructive"
        onClick={handleClick}
        title={t('deleteFileTitle')}
        aria-label={t('deleteFileTitle')}
        data-testid={TestId.MESSAGE_MEDIA_REMOVE}
        className="absolute top-1 right-1 z-10 size-7 rounded-md bg-background/80 opacity-0 backdrop-blur-sm transition-opacity group-hover/media:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
      />
    );
  }
);

export { MediaRemoveButton };
