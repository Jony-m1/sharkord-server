import { toggleMembersDrawer } from '@/features/app/actions';
import { useIsMembersDrawerOpen } from '@/features/app/hooks';
import { cn } from '@/lib/utils';
import { TestId } from '@sharkord/shared';
import { IconButton } from '@sharkord/ui';
import { Users } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TMembersDrawerToggleProps = {
  className?: string;
};

// below lg the top bar, and the members button in it, is hidden, so a conversation's header
// opens the members drawer instead
const MembersDrawerToggle = memo(({ className }: TMembersDrawerToggleProps) => {
  const { t } = useTranslation('topbar');
  const isOpen = useIsMembersDrawerOpen();

  return (
    <IconButton
      icon={Users}
      variant="ghost"
      onClick={toggleMembersDrawer}
      aria-label={isOpen ? t('closeMembersSidebar') : t('openMembersSidebar')}
      aria-pressed={isOpen}
      data-testid={TestId.MEMBERS_DRAWER_TOGGLE}
      className={cn('size-9 lg:hidden', className)}
    />
  );
});

export { MembersDrawerToggle };
