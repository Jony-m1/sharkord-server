import {
  getPendingUploads,
  subscribeToPendingUploads
} from '@/lib/pending-uploads';
import type { TConversationKey } from '@/types';
import { useMemo, useSyncExternalStore } from 'react';

export const usePendingUploads = (conversationKey: TConversationKey) => {
  const uploads = useSyncExternalStore(
    subscribeToPendingUploads,
    getPendingUploads
  );

  return useMemo(
    () =>
      uploads.filter((upload) => upload.conversationKey === conversationKey),
    [uploads, conversationKey]
  );
};
