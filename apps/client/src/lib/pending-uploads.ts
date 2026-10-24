import { uploadFile } from '@/helpers/upload-file';
import { getTRPCClient } from '@/lib/trpc';
import type { TConversationKey } from '@/types';
import type { TTempFile } from '@sharkord/shared';

// messages whose files are still going up, shown at the foot of their conversation. kept out of
// redux on purpose: an upload holds File objects and an AbortController, which a store must not
export type TPendingUpload = {
  id: string;
  conversationKey: TConversationKey;
  fileNames: string[];
  totalBytes: number;
  sentBytes: number;
  // the files are up and the message is on its way, too late to cancel
  sending: boolean;
};

type TStartPendingUpload = {
  conversationKey: TConversationKey;
  files: File[];
  send: (files: TTempFile[]) => Promise<boolean>;
};

// progress events come many times a second; the bar does not need them all
const PROGRESS_INTERVAL_MS = 250;

let uploads: TPendingUpload[] = [];
let nextId = 0;
const listeners = new Set<() => void>();
const controllers = new Map<string, AbortController>();

const emit = () => {
  for (const listener of listeners) listener();
};

const updateUpload = (id: string, changes: Partial<TPendingUpload>) => {
  uploads = uploads.map((upload) =>
    upload.id === id ? { ...upload, ...changes } : upload
  );
  emit();
};

const removeUpload = (id: string) => {
  uploads = uploads.filter((upload) => upload.id !== id);
  controllers.delete(id);
  emit();
};

// a file that did go up waits on the server for a message to take it; when the message is not
// sent it is handed back now rather than left until it expires
const discardTemporaryFiles = async (files: TTempFile[]) => {
  try {
    const trpc = getTRPCClient();

    await Promise.all(
      files.map((file) =>
        trpc.files.deleteTemporary.mutate({ fileId: file.id }).catch(() => {
          // already gone, it expires on its own otherwise
        })
      )
    );
  } catch {
    // no client during a reconnect; the files expire on their own
  }
};

const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

// uploads the files of a message, then sends it with them. it never rejects: a failed file has
// said why (uploadFile), and a cancelled or failed one leaves the message unsent
export const startPendingUpload = async ({
  conversationKey,
  files,
  send
}: TStartPendingUpload) => {
  nextId += 1;

  const id = `upload-${nextId}`;
  const controller = new AbortController();
  const totalBytes = sum(files.map((file) => file.size));
  const sentPerFile = files.map(() => 0);
  let lastProgressAt = 0;

  controllers.set(id, controller);
  uploads = [
    ...uploads,
    {
      id,
      conversationKey,
      fileNames: files.map((file) => file.name),
      totalBytes,
      sentBytes: 0,
      sending: false
    }
  ];
  emit();

  const results = await Promise.all(
    files.map(async (file, index) => {
      const result = await uploadFile(file, {
        signal: controller.signal,
        onProgress: ({ loaded }) => {
          sentPerFile[index] = loaded;

          const now = Date.now();

          if (now - lastProgressAt < PROGRESS_INTERVAL_MS) return;

          lastProgressAt = now;
          updateUpload(id, { sentBytes: sum(sentPerFile) });
        }
      });

      // one file failing sinks the message, so the others stop rather than finish for nothing
      if (!result) controller.abort();

      return result;
    })
  );

  const uploaded = results.filter((file): file is TTempFile => !!file);

  if (controller.signal.aborted || uploaded.length !== files.length) {
    removeUpload(id);
    await discardTemporaryFiles(uploaded);

    return;
  }

  updateUpload(id, { sending: true, sentBytes: totalBytes });

  const sent = await send(uploaded);

  removeUpload(id);

  if (!sent) {
    await discardTemporaryFiles(uploaded);
  }
};

// stops the upload; the server deletes what had arrived of the file in flight, and files that
// had finished are discarded once the others have stopped
export const cancelPendingUpload = (id: string) => {
  const controller = controllers.get(id);

  if (controller) controller.abort();
};

export const subscribeToPendingUploads = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const getPendingUploads = () => uploads;
