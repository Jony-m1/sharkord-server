import type { IRootState } from '@/features/store';
import { UserStatus } from '@sharkord/shared';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  bannedUserIdsSelector,
  filteredUsersSelector,
  isOwnUserSelector,
  isUserAfkSelector,
  isUserBannedSelector,
  onlineUserIdsSelector,
  ownUserHasRoleSelector,
  ownUserIdSelector,
  ownUserPasswordSetSelector,
  ownUserRoleIdsSelector,
  ownUserSelector,
  userByIdSelector,
  usernamesSelector,
  usersSelector,
  userStatusSelector
} from './selectors';

export const useUsers = () => useSelector(usersSelector);

export const useOwnUserId = () => useSelector(ownUserIdSelector);

export const useOwnUserPasswordSet = () =>
  useSelector(ownUserPasswordSetSelector);

export const useIsOwnUser = (userId: number | null) =>
  useSelector((state: IRootState) =>
    userId !== null ? isOwnUserSelector(state, userId) : false
  );

export const useUserById = (userId: number | null) =>
  useSelector((state: IRootState) =>
    userId !== null ? userByIdSelector(state, userId) : undefined
  );

export const useOwnPublicUser = () =>
  useSelector((state: IRootState) => ownUserSelector(state));

export const useUserStatus = (userId: number) =>
  useSelector((state: IRootState) => userStatusSelector(state, userId));

export const useIsUserAfk = (userId: number | null) =>
  useSelector((state: IRootState) => isUserAfkSelector(state, userId));

// the server reports a user who marked themselves away as idle, and nothing else makes anyone
// idle, so idle reads as AFK everywhere it is shown
export const useUserStatusLabel = (userId: number) => {
  const { t } = useTranslation('common');
  const status = useUserStatus(userId);
  const isAfk = useIsUserAfk(userId);

  if (isAfk) return t('sidebar:afk');

  if (status === UserStatus.ONLINE) return t('statusOnline');

  return t('statusOffline');
};

export const useOnlineUserIds = () => useSelector(onlineUserIdsSelector);

export const useBannedUserIds = () => useSelector(bannedUserIdsSelector);

export const useIsUserBanned = (userId: number) =>
  useSelector((state: IRootState) => isUserBannedSelector(state, userId));

export const useUsernames = () => useSelector(usernamesSelector);

export const useFilteredUsers = () => useSelector(filteredUsersSelector);

export const useOwnUserRoleIds = () => useSelector(ownUserRoleIdsSelector);

export const useOwnUserHasRole = (roleId: number) =>
  useSelector((state: IRootState) => ownUserHasRoleSelector(state, roleId));
