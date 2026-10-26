import { setModViewOpen } from '@/features/app/actions';
import { useModViewOpen } from '@/features/app/hooks';
import { useAdminUserInfo } from '@/features/server/admin/hooks';
import { extractUrls } from '@sharkord/shared';
import { Sheet, SheetContent, SheetTitle, Skeleton } from '@sharkord/ui';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ModViewContext, ModViewScreen, type TModViewContext } from './context';
import { ModViewContent } from './mod-view-content';

const SKELETON_ROWS = [0, 1, 2, 3];

// the shape of the header and the first card, so the sheet does not jump when they arrive
const ModViewSkeleton = memo(() => (
  <div className="space-y-4 p-4">
    <div className="flex items-center gap-3">
      <Skeleton className="h-12 w-12 rounded-full" />
      <Skeleton className="h-5 w-40" />
    </div>
    <div className="flex gap-1.5">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-8 w-20" />
    </div>
    <div className="border-t border-border" />
    <div className="space-y-3 rounded-xl border p-4">
      {SKELETON_ROWS.map((row) => (
        <Skeleton key={row} className="block h-5 w-full" />
      ))}
    </div>
  </div>
));

type TContentWrapperProps = {
  userId: number;
};

const ContentWrapper = memo(({ userId }: TContentWrapperProps) => {
  const [currentView, setCurrentView] = useState<ModViewScreen | undefined>(
    undefined
  );
  const { user, refetch, logins, files, messages, storage } =
    useAdminUserInfo(userId);

  const contextValue = useMemo<TModViewContext>(() => {
    const links: string[] = messages
      .map((msg) => extractUrls(msg.content ?? ''))
      .flat()
      .filter((value, index, self) => self.indexOf(value) === index);

    return {
      userId,
      user: user!,
      logins,
      files,
      storage,
      messages,
      links,
      refetch,
      view: currentView,
      setView: setCurrentView
    };
  }, [userId, refetch, files, storage, user, logins, messages, currentView]);

  // a refetch after a kick or a role change keeps showing what is there; only the first load,
  // with nothing to show yet, gets the placeholder
  if (!user) return <ModViewSkeleton />;

  return (
    <ModViewContext.Provider value={contextValue}>
      <ModViewContent />
    </ModViewContext.Provider>
  );
});

const ModViewSheet = memo(() => {
  const { t } = useTranslation('settings');
  const { isOpen, userId } = useModViewOpen();

  // escape and a click on the overlay close it through here. radix only hands escape to the
  // topmost layer, so a dialog opened from the sheet closes first
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) setModViewOpen(false);
  }, []);

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent aria-describedby={undefined}>
        <SheetTitle className="sr-only">{t('modViewTitle')}</SheetTitle>
        {userId !== undefined && (
          <ContentWrapper key={userId} userId={userId} />
        )}
      </SheetContent>
    </Sheet>
  );
});

export { ModViewSheet };
