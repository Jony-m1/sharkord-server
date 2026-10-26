import { TestId } from '@sharkord/shared';
import { Skeleton } from '@sharkord/ui';
import { memo } from 'react';

// sits in the message list and fills it from the bottom up, where the newest messages land,
// so the rows are replaced in place instead of the list jumping once the page arrives
const TextSkeleton = memo(() => {
  return (
    <div
      data-testid={TestId.MESSAGES_SKELETON}
      className="flex h-full flex-col justify-end gap-4 overflow-hidden px-2"
    >
      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>

      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>

      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>

      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>

      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-18" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-2/5" />
        </div>
      </div>

      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-26" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>

      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-22" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-3/5" />
        </div>
      </div>

      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>

      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-30" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
    </div>
  );
});

export { TextSkeleton };
