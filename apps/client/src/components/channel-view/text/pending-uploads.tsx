import { usePendingUploads } from '@/hooks/use-pending-uploads';
import {
  cancelPendingUpload,
  type TPendingUpload
} from '@/lib/pending-uploads';
import type { TConversationKey } from '@/types';
import { TestId } from '@sharkord/shared';
import { IconButton } from '@sharkord/ui';
import { filesize } from 'filesize';
import { FileUp, X } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TPendingUploadRowProps = {
  upload: TPendingUpload;
};

const PendingUploadRow = memo(({ upload }: TPendingUploadRowProps) => {
  const { t } = useTranslation('common');
  const { id, fileNames, totalBytes, sentBytes, sending } = upload;

  const onCancel = useCallback(() => {
    cancelPendingUpload(id);
  }, [id]);

  const percent =
    totalBytes > 0 ? Math.round((sentBytes / totalBytes) * 100) : 100;

  let label = fileNames[0];

  if (fileNames.length > 1) {
    label = t('uploadingFileCount', { count: fileNames.length });
  }

  let status = `${filesize(sentBytes)} / ${filesize(totalBytes)}, ${percent}%`;

  if (sending) {
    status = t('uploadSending');
  }

  return (
    <div
      data-testid={TestId.PENDING_UPLOAD}
      className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
    >
      <FileUp className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="truncate font-medium" title={fileNames.join(', ')}>
            {label}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {status}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      {!sending && (
        <IconButton
          icon={X}
          variant="ghost"
          size="sm"
          onClick={onCancel}
          title={t('cancelUpload')}
          aria-label={t('cancelUpload')}
          data-testid={TestId.PENDING_UPLOAD_CANCEL}
        />
      )}
    </div>
  );
});

type TPendingUploadsProps = {
  conversationKey: TConversationKey;
};

// messages still sending their files, at the foot of the conversation they will land in
const PendingUploads = memo(({ conversationKey }: TPendingUploadsProps) => {
  const uploads = usePendingUploads(conversationKey);

  if (uploads.length === 0) return null;

  return (
    <div className="mx-2 mb-1 flex flex-col gap-1">
      {uploads.map((upload) => (
        <PendingUploadRow key={upload.id} upload={upload} />
      ))}
    </div>
  );
});

export { PendingUploads };
