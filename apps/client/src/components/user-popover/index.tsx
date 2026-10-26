import { useUserById } from '@/features/server/users/hooks';
import { isPhoneLayout } from '@/helpers/is-phone-layout';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetTitle
} from '@sharkord/ui';
import { memo, useCallback, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ProfileCard } from './profile-card';

type TUserPopoverProps = {
  userId: number;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
};

// for screen readers; inside the sheet, so only an open one translates it
const ProfileSheetTitle = memo(() => {
  const { t } = useTranslation('common');

  return <SheetTitle className="sr-only">{t('userProfile')}</SheetTitle>;
});

// only the trigger lives here, so the many closed cards on screen cost one store read each. on a
// phone there is no room beside the trigger, so the same card slides up from the bottom instead,
// the way Discord mobile shows a profile
const UserPopover = memo(
  ({
    userId,
    children,
    side = 'right',
    align = 'start'
  }: TUserPopoverProps) => {
    const user = useUserById(userId);
    const [open, setOpen] = useState(false);
    const [asSheet, setAsSheet] = useState(false);

    const handleOpenChange = useCallback((nextOpen: boolean) => {
      // decided per open, so turning a tablet round between two opens is picked up
      if (nextOpen) setAsSheet(isPhoneLayout());

      setOpen(nextOpen);
    }, []);

    const close = useCallback(() => setOpen(false), []);

    if (!user) return <>{children}</>;

    return (
      <>
        <Popover open={open && !asSheet} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>{children}</PopoverTrigger>
          <PopoverContent
            className="w-80 max-w-[calc(100vw-1rem)] p-0"
            side={side}
            align={align}
            collisionPadding={8}
          >
            <ProfileCard userId={userId} onClose={close} />
          </PopoverContent>
        </Popover>

        {asSheet && (
          <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent
              side="bottom"
              aria-describedby={undefined}
              className="mx-auto max-h-[85dvh] max-w-lg gap-0 overflow-y-auto rounded-t-xl p-0"
            >
              <ProfileSheetTitle />
              <ProfileCard userId={userId} onClose={close} asSheet />
            </SheetContent>
          </Sheet>
        )}
      </>
    );
  }
);

UserPopover.displayName = 'UserPopover';

export { UserPopover };
