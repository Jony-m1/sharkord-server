import { getFileUrl } from '@/helpers/get-file-url';
import type { TJoinedMessage } from '@sharkord/shared';
import { memo, useCallback } from 'react';
import { FileCard } from '../file-card';

type TAttachmentCardProps = {
  file: TJoinedMessage['files'][number];
  onRemoveFile?: (fileId: number) => void;
};

const AttachmentCard = memo(({ file, onRemoveFile }: TAttachmentCardProps) => {
  const handleRemove = useCallback(() => {
    onRemoveFile?.(file.id);
  }, [onRemoveFile, file.id]);

  return (
    <FileCard
      name={file.originalName}
      extension={file.extension}
      size={file.size}
      onRemove={onRemoveFile ? handleRemove : undefined}
      href={getFileUrl(file)}
    />
  );
});

export { AttachmentCard };
