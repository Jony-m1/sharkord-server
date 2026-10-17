import { ServerEvents, UserStatus } from '@sharkord/shared';
import { getPublicUserById } from '../db/queries/users';
import { pubsub } from '../utils/pubsub';

// users who marked themselves away; kept in memory only, so it ends with their last connection
const afkUserIds = new Set<number>();

const isAfk = (userId: number) => afkUserIds.has(userId);

// an online user who marked themselves away shows as idle to everyone
const withAfk = (userId: number, status: UserStatus) =>
  status === UserStatus.ONLINE && isAfk(userId) ? UserStatus.IDLE : status;

const setAfk = async (userId: number, afk: boolean) => {
  if (afk) {
    afkUserIds.add(userId);
  } else {
    afkUserIds.delete(userId);
  }

  const user = await getPublicUserById(userId);

  if (!user) return;

  pubsub.publish(ServerEvents.USER_UPDATE, {
    ...user,
    status: afk ? UserStatus.IDLE : UserStatus.ONLINE
  });
};

const clearAfk = (userId: number) => {
  afkUserIds.delete(userId);
};

const clearAfkForTests = () => {
  afkUserIds.clear();
};

export { clearAfk, clearAfkForTests, isAfk, setAfk, withAfk };
