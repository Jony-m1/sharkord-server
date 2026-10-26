import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { TimeStats } from '@/components/server-screens/user-settings/profile/time-stats';
import { VolumeControlContext } from '@/components/voice-provider/volume-control-context';
import {
  useUserRoles,
  useVisibleServerVoiceChannelIdByUserId
} from '@/features/server/hooks';
import {
  useIsOwnUser,
  useUserById,
  useUserStatusLabel
} from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { useDateLocale } from '@/hooks/use-date-locale';
import { cn } from '@/lib/utils';
import {
  DELETED_USER_IDENTITY_AND_NAME,
  PluginSlot,
  TestId
} from '@sharkord/shared';
import { format } from 'date-fns';
import { ShieldCheck, Trash } from 'lucide-react';
import { memo, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RoleBadge } from '../role-badge';
import { UserAvatar } from '../user-avatar';
import { OtherProfileActions, OwnProfileActions } from './profile-actions';
import { ProfileVoiceRow } from './profile-voice-row';

type TProfileBannerProps = {
  bannerUrl: string | undefined;
  profileColor: string;
};

const ProfileBanner = memo(
  ({ bannerUrl, profileColor }: TProfileBannerProps) => {
    if (bannerUrl) {
      return (
        <div
          className="h-24 w-full rounded-t-md bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url("${bannerUrl}")` }}
        />
      );
    }

    return (
      <div
        className="h-24 w-full rounded-t-md"
        style={{ background: profileColor }}
      />
    );
  }
);

type TProfileCardProps = {
  userId: number;
  onClose: () => void;
  asSheet?: boolean;
};

// the body of a profile card, mounted only while it is open: every avatar, mention and member
// row has a card behind it, and none of them should watch the store while theirs is closed
const ProfileCard = memo(({ userId, onClose, asSheet }: TProfileCardProps) => {
  const { t } = useTranslation('common');
  const dateLocale = useDateLocale();
  const user = useUserById(userId);
  const roles = useUserRoles(userId);
  const isOwnUser = useIsOwnUser(userId);
  const statusLabel = useUserStatusLabel(userId);
  const voiceChannelId = useVisibleServerVoiceChannelIdByUserId(userId);
  // settings screens render outside the voice provider, where joining a call would connect
  // no media, so the voice row only shows inside the server view
  const insideVoiceProvider = useContext(VolumeControlContext) !== null;

  const pluginProps = useMemo(() => ({ userId }), [userId]);

  if (!user) return null;

  const isDeleted = user.name === DELETED_USER_IDENTITY_AND_NAME;
  // the phone sheet keeps its close button in the top right corner, so there the badge moves left
  const badgeClassName = cn(
    'absolute top-2 flex items-center gap-1 rounded-md px-2 py-1 text-xs text-white',
    asSheet ? 'left-2' : 'right-2'
  );

  return (
    <div data-testid={TestId.USER_POPOVER}>
      <div className="relative">
        {user.banned && (
          <div className={cn(badgeClassName, 'bg-red-500')}>
            <ShieldCheck className="h-3 w-3" />
            {t('bannedBadge')}
          </div>
        )}
        {isDeleted && (
          <div className={cn(badgeClassName, 'bg-gray-600')}>
            <Trash className="h-3 w-3" />
            {t('deletedBadge')}
          </div>
        )}
        <ProfileBanner
          bannerUrl={getFileUrl(user.banner)}
          profileColor={user.profileColor}
        />
        <div className="absolute left-4 top-16">
          <UserAvatar
            userId={user.id}
            className="h-16 w-16 border-4 border-card"
          />
        </div>
      </div>

      <div className="px-4 pb-4 pt-12">
        <div className="mb-3 min-w-0">
          <p className="truncate text-lg font-semibold text-foreground">
            {getRenderedUsername(user)}
          </p>
          <p className="text-xs text-muted-foreground">{statusLabel}</p>
        </div>

        {roles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {roles.map((role) => (
              <RoleBadge key={role.id} role={role} />
            ))}
          </div>
        )}

        {insideVoiceProvider && voiceChannelId !== undefined && (
          <ProfileVoiceRow
            userId={user.id}
            channelId={voiceChannelId}
            isOwnUser={isOwnUser}
            onJoin={onClose}
          />
        )}

        {user.bio && (
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
            {user.bio}
          </p>
        )}

        <div className="mt-4 space-y-2 border-t border-border pt-3">
          {!isDeleted && <TimeStats userId={user.id} compact />}
          <p className="text-xs text-muted-foreground">
            {t('memberSince', {
              date: format(new Date(user.createdAt), 'PP', {
                locale: dateLocale
              })
            })}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 empty:hidden">
          <PluginSlotRenderer
            slotId={PluginSlot.USER_POPOVER}
            props={pluginProps}
          />
        </div>

        <div className="mt-3">
          {isOwnUser && (
            <OwnProfileActions userId={user.id} onClose={onClose} />
          )}
          {!isOwnUser && (
            <OtherProfileActions
              userId={user.id}
              roleIds={user.roleIds}
              banned={Boolean(user.banned)}
              isDeleted={isDeleted}
              voiceChannelId={voiceChannelId}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
});

export { ProfileCard };
