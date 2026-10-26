import type { IRootState } from '@/features/store';
import { UserStatus, type TJoinedPublicUser } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import {
  bannedUserIdsSelector,
  isUserBannedSelector,
  onlineUserIdsSelector
} from '../selectors';

const user = (id: number, status: UserStatus | undefined, banned = false) =>
  ({ id, name: `user-${id}`, status, banned }) as TJoinedPublicUser;

const stateWith = (users: TJoinedPublicUser[]) =>
  ({ server: { users } }) as unknown as IRootState;

describe('onlineUserIdsSelector', () => {
  test('should count online and idle users as online', () => {
    const state = stateWith([
      user(1, UserStatus.ONLINE),
      user(2, UserStatus.IDLE),
      user(3, UserStatus.OFFLINE),
      user(4, undefined)
    ]);

    expect([...onlineUserIdsSelector(state)].sort()).toEqual([1, 2]);
  });

  // the last status seen for someone can be stale once they are banned
  test('should never count a banned user as online', () => {
    const state = stateWith([user(1, UserStatus.ONLINE, true)]);

    expect(onlineUserIdsSelector(state).has(1)).toBe(false);
  });

  test('should hand back the same set for an unchanged state', () => {
    const state = stateWith([user(1, UserStatus.ONLINE)]);

    expect(onlineUserIdsSelector(state)).toBe(onlineUserIdsSelector(state));
  });
});

describe('bannedUserIdsSelector', () => {
  test('should list the banned users only', () => {
    const state = stateWith([
      user(1, UserStatus.ONLINE),
      user(2, UserStatus.OFFLINE, true),
      user(3, undefined, true)
    ]);

    expect([...bannedUserIdsSelector(state)].sort()).toEqual([2, 3]);
  });

  test('should hand back the same set for an unchanged state', () => {
    const state = stateWith([user(1, UserStatus.ONLINE, true)]);

    expect(bannedUserIdsSelector(state)).toBe(bannedUserIdsSelector(state));
  });
});

describe('isUserBannedSelector', () => {
  test('should follow the banned flag of the stored user', () => {
    const state = stateWith([
      user(1, UserStatus.ONLINE),
      user(2, UserStatus.OFFLINE, true)
    ]);

    expect(isUserBannedSelector(state, 1)).toBe(false);
    expect(isUserBannedSelector(state, 2)).toBe(true);
  });

  // a ban from the moderation view reaches the store through the user update event
  test('should pick up a ban that lands in the store', () => {
    const before = stateWith([user(1, UserStatus.ONLINE)]);
    const after = stateWith([user(1, UserStatus.ONLINE, true)]);

    expect(isUserBannedSelector(before, 1)).toBe(false);
    expect(isUserBannedSelector(after, 1)).toBe(true);
  });

  test('should be false for a user the store does not hold', () => {
    const state = stateWith([user(1, UserStatus.ONLINE, true)]);

    expect(isUserBannedSelector(state, 99)).toBe(false);
  });
});
