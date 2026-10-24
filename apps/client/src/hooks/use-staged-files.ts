import { useChannelById } from '@/features/server/channels/hooks';
import { useCan, usePublicServerSettings } from '@/features/server/hooks';
import {
  exceedsMaxFileSize,
  isPreviewable,
  Permission
} from '@sharkord/shared';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TStagedFile = {
  id: string;
  name: string;
  size: number;
  extension: string;
  previewUrl?: string;
  file: File;
};

let nextStagedId = 0;

const useStagedFiles = (
  channelId: number,
  containerRef: RefObject<HTMLElement | null>,
  disabled: boolean = false
) => {
  const { t } = useTranslation('common');

  const [files, setFiles] = useState<TStagedFile[]>([]);
  const filesRef = useRef<TStagedFile[]>([]);
  const settings = usePublicServerSettings();
  const selectedChannel = useChannelById(channelId);
  const can = useCan();

  const isDmChannel = !!selectedChannel?.isDm;

  const canShareFilesInDirectMessages =
    !isDmChannel || !!settings?.storageFileSharingInDirectMessages;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // hackers gonna hack
  filesRef.current = files;

  const takeAllowedFiles = useCallback(
    (filesToUpload: File[]) => {
      const maxFilesPerMessage =
        settings?.storageMaxFilesPerMessage ?? Number.MAX_SAFE_INTEGER;
      const remainingSlots = maxFilesPerMessage - filesRef.current.length;

      if (remainingSlots <= 0) {
        toast.warning(
          `Maximum attachments reached (${maxFilesPerMessage} per message).`
        );
        return [];
      }

      if (filesToUpload.length > remainingSlots) {
        const discardedCount = filesToUpload.length - remainingSlots;

        toast.warning(
          `${discardedCount} file${discardedCount > 1 ? 's were' : ' was'} ignored due to the per-message attachment limit.`
        );
      }

      return filesToUpload.slice(0, remainingSlots);
    },
    [settings?.storageMaxFilesPerMessage]
  );

  const removeFile = useCallback((id: string) => {
    const removed = filesRef.current.find((file) => file.id === id);

    if (removed?.previewUrl) {
      URL.revokeObjectURL(removed.previewUrl);
    }

    setFiles((prev) => prev.filter((file) => file.id !== id));
  }, []);

  const clearFiles = useCallback(() => {
    for (const { previewUrl } of filesRef.current) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    }

    setFiles([]);
  }, []);

  const checkUploadPermissions = useCallback(() => {
    if (disabled) return false;

    if (!settings?.storageUploadEnabled) {
      toast.warning(t('common:uploadsDisabled'));

      return false;
    }

    if (!canShareFilesInDirectMessages) {
      toast.warning(
        'File sharing in direct messages is disabled on this server.'
      );

      return false;
    }

    if (!can(Permission.UPLOAD_FILES)) {
      toast.error(t('common:noUploadPermission'));

      return false;
    }

    return true;
  }, [
    t,
    disabled,
    settings?.storageUploadEnabled,
    canShareFilesInDirectMessages,
    can
  ]);

  const openFileDialog = useCallback(() => {
    if (!checkUploadPermissions()) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, [checkUploadPermissions]);

  // files wait in the box until the message is sent (startPendingUpload); nothing goes to the
  // server before then, so a file dropped by mistake costs nothing
  const processFiles = useCallback(
    (filesToStage: File[]) => {
      const allowed = takeAllowedFiles(filesToStage);

      if (!allowed.length) return;

      const maxFileSize =
        settings?.storageUploadMaxFileSize ?? Number.MAX_SAFE_INTEGER;
      const withinLimit: File[] = [];

      for (const file of allowed) {
        if (exceedsMaxFileSize(file.size, maxFileSize)) {
          toast.error(`"${file.name}" exceeds the maximum file size limit.`);
        } else {
          withinLimit.push(file);
        }
      }

      if (!withinLimit.length) return;

      const staged: TStagedFile[] = withinLimit.map((file) => {
        const parts = file.name.split('.');
        const extension = parts.length > 1 ? `.${parts.pop()}` : '';

        nextStagedId += 1;

        return {
          id: `staged-${nextStagedId}`,
          name: file.name,
          size: file.size,
          extension,
          previewUrl: isPreviewable(file)
            ? URL.createObjectURL(file)
            : undefined,
          file
        };
      });

      setFiles((prev) => [...prev, ...staged]);
    },
    [takeAllowedFiles, settings?.storageUploadMaxFileSize]
  );

  const onFileDialogChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const list = event.currentTarget.files;

      if (!list || list.length === 0) return;

      processFiles(Array.from(list));
    },
    [processFiles]
  );

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !settings?.storageUploadEnabled || disabled) return;

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items ?? [];
      const hasFiles = Array.from(items).some((item) => item.kind === 'file');

      if (hasFiles && !checkUploadPermissions()) return;

      const filesToUpload: File[] = [];

      for (let i = 0; i < items.length; i++) {
        if (items[i].kind !== 'file') continue;

        const pastedFile = items[i].getAsFile();

        if (!pastedFile) continue;

        filesToUpload.push(pastedFile);
      }

      processFiles(filesToUpload);
    };

    const handleDrop = (event: DragEvent) => {
      event.preventDefault();

      const items = event.dataTransfer?.items ?? [];
      const dFiles = event.dataTransfer?.files ?? [];
      const hasFiles =
        Array.from(items).some((item) => item.kind === 'file') ||
        dFiles.length > 0;

      if (hasFiles && !checkUploadPermissions()) return;

      const filesToUpload: File[] = [];

      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].kind === 'file') {
            const file = items[i].getAsFile();

            if (file) filesToUpload.push(file);
          }
        }
      } else {
        for (let i = 0; i < dFiles.length; i++) {
          filesToUpload.push(dFiles[i]);
        }
      }

      processFiles(filesToUpload);
    };

    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
    };

    container.addEventListener('paste', handlePaste);
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);

    return () => {
      container.removeEventListener('paste', handlePaste);
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('drop', handleDrop);
    };
  }, [
    checkUploadPermissions,
    settings?.storageUploadEnabled,
    disabled,
    containerRef,
    processFiles
  ]);

  const fileInputProps = useMemo(
    () => ({
      ref: fileInputRef,
      type: 'file' as const,
      multiple: true,
      onChange: onFileDialogChange,
      style: { display: 'none' }
    }),
    [onFileDialogChange]
  );

  return useMemo(
    () => ({
      files,
      removeFile,
      clearFiles,
      openFileDialog,
      fileInputProps
    }),
    [files, removeFile, clearFiles, openFileDialog, fileInputProps]
  );
};

export { useStagedFiles, type TStagedFile };
