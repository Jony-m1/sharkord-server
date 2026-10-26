import { UserAvatar } from '@/components/user-avatar';
import { useOwnPublicUser } from '@/features/server/users/hooks';
import { TestId } from '@sharkord/shared';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { CardTheme } from './card-theme';

// holds your own place in the call until the server lists you in it, so the call is on screen
// from the first frame and your real card takes over this same grid cell when it arrives
const JoiningCard = memo(() => {
  const { t } = useTranslation('sidebar');
  const ownUser = useOwnPublicUser();

  if (!ownUser) return null;

  return (
    <div
      data-testid={TestId.VOICE_JOINING_CARD}
      className="relative flex size-full items-center justify-center overflow-hidden rounded border border-border bg-card group/voice-user-card"
    >
      <CardTheme profileColor={ownUser.profileColor} />
      <div className="relative flex flex-col items-center gap-3">
        <div className="relative">
          <span className="absolute -inset-1.5 rounded-full ring-2 ring-yellow-500 animate-pulse motion-reduce:animate-none" />
          <UserAvatar
            userId={ownUser.id}
            showStatusBadge={false}
            className="pointer-events-none size-12 md:size-16 lg:size-24"
          />
        </div>
        <span role="status" className="text-xs font-medium text-yellow-500">
          {t('voiceConnecting')}
        </span>
      </div>
    </div>
  );
});

export { JoiningCard };
