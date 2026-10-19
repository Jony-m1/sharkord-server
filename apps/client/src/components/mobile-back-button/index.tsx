import { closeMobileContent } from '@/features/server/actions';
import { cn } from '@/lib/utils';
import { TestId } from '@sharkord/shared';
import { IconButton } from '@sharkord/ui';
import { ArrowLeft } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TMobileBackButtonProps = {
  className?: string;
};

// phones only, where the channel list and the open conversation are two screens
const MobileBackButton = memo(({ className }: TMobileBackButtonProps) => {
  const { t } = useTranslation('topbar');

  return (
    <IconButton
      icon={ArrowLeft}
      variant="ghost"
      onClick={closeMobileContent}
      aria-label={t('backToList')}
      data-testid={TestId.MOBILE_BACK_BUTTON}
      className={cn('-ml-1 size-9 md:hidden', className)}
    />
  );
});

export { MobileBackButton };
