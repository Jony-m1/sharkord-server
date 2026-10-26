import {
  ChannelType,
  DEFAULT_ROLE_PERMISSIONS,
  Permission
} from '@sharkord/shared';

import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import {
  categories,
  channels,
  logins,
  pluginData,
  rolePermissions,
  roles,
  settings,
  userRoles,
  users
} from '../../db/schema';
import { messageRenderMock } from './message-render-mock';
import { createMockMessagesChannel } from './mock-messages-channel';

const E2E_PLUGIN_ID = 'e2e-plugin';
const MODERATOR_ROLE_ID = 4;

const seedE2EPlugin = async (db: BunSQLiteDatabase) => {
  await db.update(settings).set({ enablePlugins: true });

  await db.insert(rolePermissions).values({
    roleId: MODERATOR_ROLE_ID,
    permission: Permission.USE_PLUGINS,
    createdAt: Date.now()
  });

  await db.insert(pluginData).values({
    pluginId: E2E_PLUGIN_ID,
    enabled: true,
    settings: {}
  });
};

// usernoshare holds every default permission but SHARE_SCREEN, for the voice spec that checks
// a member who may not share is never offered a share the server would refuse. the role is
// their only one, since a user gets the union of their roles and the default role has it
const seedE2ENoScreenShareMember = async (db: BunSQLiteDatabase) => {
  const now = Date.now();

  const role = await db
    .insert(roles)
    .values({
      name: 'No Screen Share',
      color: '#95a5a6',
      isPersistent: false,
      isDefault: false,
      storageQuotaOverrideEnabled: false,
      storageSpaceQuota: 0,
      createdAt: now
    })
    .returning()
    .get();

  await db.insert(rolePermissions).values(
    DEFAULT_ROLE_PERMISSIONS.filter(
      (permission) => permission !== Permission.SHARE_SCREEN
    ).map((permission) => ({
      roleId: role.id,
      permission,
      createdAt: now
    }))
  );

  const member = await db
    .insert(users)
    .values({
      name: 'No Share',
      identity: 'usernoshare',
      password: await Bun.password.hash('password123'),
      avatarId: null,
      bannerId: null,
      bio: null,
      createdAt: now
    })
    .returning()
    .get();

  await db.insert(userRoles).values({
    userId: member.id,
    roleId: role.id,
    createdAt: now
  });

  // a login on record, like every other seeded user, keeps the welcome dialog away
  await db.insert(logins).values({ userId: member.id, createdAt: now });
};

const seedE2E = async (db: BunSQLiteDatabase) => {
  await seedE2EPlugin(db);
  await seedE2ENoScreenShareMember(db);

  const e2eChannelsCategory = await db
    .insert(categories)
    .values({
      name: 'E2E Channels',
      position: 2,
      createdAt: Date.now()
    })
    .returning()
    .get();

  // read-only: the pagination specs count its pages, so nothing may send into it
  await createMockMessagesChannel(db, e2eChannelsCategory!.id, {
    name: 'Infinite Scroll',
    position: 1,
    totalMessages: 1000,
    firstNumber: 1
  });

  // for the specs that send messages, kept separate so their writes cannot shift the pages
  // the pagination specs are counting. long enough to scroll up in and load a second page
  await createMockMessagesChannel(db, e2eChannelsCategory!.id, {
    name: 'Live Messages',
    position: 2,
    totalMessages: 300,
    firstNumber: 2001
  });

  await messageRenderMock(db, e2eChannelsCategory!.id);

  // only the call view spec joins it, by switching into it, which needs it to be empty
  await db.insert(channels).values({
    name: 'Lounge',
    type: ChannelType.VOICE,
    position: 3,
    categoryId: e2eChannelsCategory!.id,
    createdAt: Date.now()
  });
};

export { seedE2E };
