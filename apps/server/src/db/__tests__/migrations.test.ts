import { STORAGE_MAX_FILE_SIZE } from '@sharkord/shared';
import { Database } from 'bun:sqlite';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import fs from 'fs';
import path from 'path';
import { findTestLog, tdb, testLogs } from '../../__tests__/setup';
import { config } from '../../config';
import {
  BACKUPS_PATH,
  SRC_MIGRATIONS_PATH,
  TMP_PATH
} from '../../helpers/paths';
import { migrateDatabase } from '../migrate';
import { settings } from '../schema';

// the guard on migrateDatabase's pragma order. a rebuild migration (create __new_x, copy,
// drop x, rename) fires every child foreign key action on the drop unless foreign keys are
// off, and the `PRAGMA foreign_keys=OFF` drizzle writes into those files cannot do it: the
// migrator runs each migration in a transaction and sqlite makes the pragma a no-op inside
// one. this runs the real chain over real rows and proves they survive it
const REBUILD_MIGRATION = '0018_message_parent_reply_foreign_keys';

const workDir = path.join(TMP_PATH, 'migration-fk-test');

const buildPartialMigrationsFolder = (upToExclusive: string) => {
  const folder = path.join(workDir, 'partial');

  fs.rmSync(folder, { recursive: true, force: true });
  fs.mkdirSync(path.join(folder, 'meta'), { recursive: true });

  const journal = JSON.parse(
    fs.readFileSync(
      path.join(SRC_MIGRATIONS_PATH, 'meta', '_journal.json'),
      'utf-8'
    )
  ) as { entries: { idx: number; tag: string }[] };

  const cutoff = journal.entries.findIndex(
    (entry) => entry.tag === upToExclusive
  );

  expect(cutoff).toBeGreaterThan(0);

  journal.entries = journal.entries.slice(0, cutoff);

  // only the sql and the journal: the migrator never reads the snapshots, and the
  // hand-written data migrations do not all have one
  for (const entry of journal.entries) {
    fs.copyFileSync(
      path.join(SRC_MIGRATIONS_PATH, `${entry.tag}.sql`),
      path.join(folder, `${entry.tag}.sql`)
    );
  }

  fs.writeFileSync(
    path.join(folder, 'meta', '_journal.json'),
    JSON.stringify(journal)
  );

  return folder;
};

// the real chain with a broken migration appended, so the failure lands after a full run of
// working ones rather than on the first statement the migrator sees
const buildBrokenTailFolder = () => {
  const folder = path.join(workDir, 'broken-tail');

  fs.rmSync(folder, { recursive: true, force: true });
  fs.mkdirSync(path.join(folder, 'meta'), { recursive: true });

  const journal = JSON.parse(
    fs.readFileSync(
      path.join(SRC_MIGRATIONS_PATH, 'meta', '_journal.json'),
      'utf-8'
    )
  ) as { entries: { idx: number; when: number; tag: string }[] };

  for (const entry of journal.entries) {
    fs.copyFileSync(
      path.join(SRC_MIGRATIONS_PATH, `${entry.tag}.sql`),
      path.join(folder, `${entry.tag}.sql`)
    );
  }

  const last = journal.entries.at(-1)!;

  journal.entries.push({
    ...last,
    idx: last.idx + 1,
    when: last.when + 1000,
    tag: '9999_broken'
  });

  fs.writeFileSync(path.join(folder, '9999_broken.sql'), 'THIS IS NOT SQL;');
  fs.writeFileSync(
    path.join(folder, 'meta', '_journal.json'),
    JSON.stringify(journal)
  );

  return folder;
};

afterAll(() => {
  fs.rmSync(workDir, { recursive: true, force: true });
});

// a database as the fork left it before it was rebuilt on upstream 0.0.28: upstream through
// 0035, then the fork's time totals as 0036 with the stamp it shipped with
const OLD_FORK_TIME_TOTALS = {
  tag: '0036_user_time_totals',
  when: 1792141087404
};

const buildOldForkFolder = () => {
  const folder = path.join(workDir, 'old-fork');

  fs.rmSync(folder, { recursive: true, force: true });
  fs.mkdirSync(path.join(folder, 'meta'), { recursive: true });

  const journal = JSON.parse(
    fs.readFileSync(
      path.join(SRC_MIGRATIONS_PATH, 'meta', '_journal.json'),
      'utf-8'
    )
  ) as { entries: { idx: number; when: number; tag: string }[] };

  const cutoff = journal.entries.findIndex(
    (entry) => entry.tag === '0036_plugin_storage'
  );

  journal.entries = journal.entries.slice(0, cutoff);

  for (const entry of journal.entries) {
    fs.copyFileSync(
      path.join(SRC_MIGRATIONS_PATH, `${entry.tag}.sql`),
      path.join(folder, `${entry.tag}.sql`)
    );
  }

  const last = journal.entries.at(-1)!;

  journal.entries.push({ ...last, idx: last.idx + 1, ...OLD_FORK_TIME_TOTALS });

  // the same columns the fork added then and 0039 adds now
  fs.copyFileSync(
    path.join(SRC_MIGRATIONS_PATH, '0039_user_time_totals.sql'),
    path.join(folder, `${OLD_FORK_TIME_TOTALS.tag}.sql`)
  );
  fs.writeFileSync(
    path.join(folder, 'meta', '_journal.json'),
    JSON.stringify(journal)
  );

  return folder;
};

describe('migrations', () => {
  // the pragma is turned off for the whole migration run, so the only thing that turns it
  // back on is the finally. a failed migration that left it off would give the process a
  // connection with no cascades and no constraint enforcement at all
  test('should turn foreign keys back on when a migration fails', async () => {
    fs.mkdirSync(workDir, { recursive: true });

    const dbPath = path.join(workDir, `fk-fail-${Date.now()}.sqlite`);
    const sqlite = new Database(dbPath, { create: true, strict: true });
    const db = drizzle({ client: sqlite });

    const brokenFolder = path.join(workDir, 'broken');

    fs.rmSync(brokenFolder, { recursive: true, force: true });
    fs.mkdirSync(path.join(brokenFolder, 'meta'), { recursive: true });
    fs.writeFileSync(
      path.join(brokenFolder, 'meta', '_journal.json'),
      JSON.stringify({
        version: '7',
        dialect: 'sqlite',
        entries: [
          {
            idx: 0,
            version: '6',
            when: 1,
            tag: '0000_broken',
            breakpoints: true
          }
        ]
      })
    );
    fs.writeFileSync(
      path.join(brokenFolder, '0000_broken.sql'),
      'THIS IS NOT SQL;'
    );

    const foreignKeysOn = () =>
      (sqlite.query('PRAGMA foreign_keys').get() as { foreign_keys: number })
        .foreign_keys === 1;

    testLogs.length = 0;

    await expect(migrateDatabase(sqlite, db, brokenFolder)).rejects.toThrow();

    expect(foreignKeysOn()).toBe(true);

    // the sqlite error alone does not say which file it came from, and the rollback wipes
    // the one table that could be asked afterwards
    const reported = findTestLog('error', 'Migration failed while applying');

    expect(reported).toBeDefined();
    expect(reported!.message).toContain('0000_broken');
    expect(reported!.message).toContain('rolled back');

    sqlite.close();
  });

  // a failed batch must leave the schema where the previous server version expects it,
  // which is what makes reverting the binary a real recovery path
  test('should apply nothing when a migration late in the batch fails', async () => {
    fs.mkdirSync(workDir, { recursive: true });

    const folder = buildBrokenTailFolder();
    const dbPath = path.join(workDir, `broken-tail-${Date.now()}.sqlite`);
    const sqlite = new Database(dbPath, { create: true, strict: true });
    const db = drizzle({ client: sqlite });

    await expect(migrateDatabase(sqlite, db, folder)).rejects.toThrow();

    const tables = (
      sqlite
        .query(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
        .all() as { name: string }[]
    ).map((table) => table.name);

    expect(tables).not.toContain('users');
    expect(
      (
        sqlite.query('SELECT count(*) c FROM __drizzle_migrations').get() as {
          c: number;
        }
      ).c
    ).toBe(0);

    sqlite.close();

    for (const name of fs
      .readdirSync(BACKUPS_PATH)
      .filter((entry) => entry.startsWith(path.basename(dbPath)))) {
      fs.rmSync(path.join(BACKUPS_PATH, name), { force: true });
    }
  });

  // migrations run with foreign keys off, and sqlite never revalidates existing rows when
  // the pragma comes back on, so a dangling reference a migration leaves behind is silent
  test('should name each migration it applies, once', async () => {
    fs.mkdirSync(workDir, { recursive: true });

    const dbPath = path.join(workDir, `log-${Date.now()}.sqlite`);
    const sqlite = new Database(dbPath, { create: true, strict: true });
    const db = drizzle({ client: sqlite });

    // setup.ts migrates a fresh database before every test, so the buffer already holds a
    // full chain's worth of these lines. cleared before each run rather than once at the top
    testLogs.length = 0;

    // stop short of the rebuild, so the rest of the chain is left to report on a second run
    await migrateDatabase(
      sqlite,
      db,
      buildPartialMigrationsFolder(REBUILD_MIGRATION)
    );

    expect(findTestLog('info', 'Migration 0000')).toBeDefined();
    expect(
      findTestLog('info', `Migration ${REBUILD_MIGRATION} ran`)
    ).toBeUndefined();

    testLogs.length = 0;

    await migrateDatabase(sqlite, db, SRC_MIGRATIONS_PATH);

    expect(
      findTestLog('info', `Migration ${REBUILD_MIGRATION} ran`)
    ).toBeDefined();

    // nothing is pending now, so a third run must name nothing at all
    testLogs.length = 0;

    await migrateDatabase(sqlite, db, SRC_MIGRATIONS_PATH);

    expect(findTestLog('info', 'Migration')).toBeUndefined();
    expect(findTestLog('debug', 'No migrations to run')).toBeDefined();

    sqlite.close();
  });

  test('should snapshot the database before applying pending migrations', async () => {
    fs.mkdirSync(workDir, { recursive: true });

    const dbName = `backup-${Date.now()}.sqlite`;
    const dbPath = path.join(workDir, dbName);
    const sqlite = new Database(dbPath, { create: true, strict: true });
    const db = drizzle({ client: sqlite });

    // stop short of 0023, the migration that adds users.token_version
    await migrateDatabase(
      sqlite,
      db,
      buildPartialMigrationsFolder('0023_users_token_version')
    );

    await migrateDatabase(sqlite, db, SRC_MIGRATIONS_PATH);

    const created = fs
      .readdirSync(BACKUPS_PATH)
      .filter((name) => name.startsWith(dbName))
      .sort();

    expect(created).toHaveLength(2);
    expect(created.at(-1)).toContain('before-0023_users_token_version');

    const hasTokenVersion = (target: Database) =>
      (
        target.query('PRAGMA table_info(users)').all() as { name: string }[]
      ).some((column) => column.name === 'token_version');

    const backup = new Database(path.join(BACKUPS_PATH, created.at(-1)!));

    expect(hasTokenVersion(backup)).toBe(false);
    expect(hasTokenVersion(sqlite)).toBe(true);

    backup.close();
    sqlite.close();

    for (const name of created) {
      fs.rmSync(path.join(BACKUPS_PATH, name), { force: true });
    }
  });

  // a restart loop on a broken migration would otherwise write a full copy of the database
  // per attempt, all of them identical because the failure rolls back
  test('should not snapshot twice for the same pending migration', async () => {
    fs.mkdirSync(workDir, { recursive: true });

    const folder = buildBrokenTailFolder();
    const dbName = `retry-${Date.now()}.sqlite`;
    const dbPath = path.join(workDir, dbName);
    const sqlite = new Database(dbPath, { create: true, strict: true });
    const db = drizzle({ client: sqlite });

    await expect(migrateDatabase(sqlite, db, folder)).rejects.toThrow();
    await expect(migrateDatabase(sqlite, db, folder)).rejects.toThrow();
    await expect(migrateDatabase(sqlite, db, folder)).rejects.toThrow();

    const created = fs
      .readdirSync(BACKUPS_PATH)
      .filter((name) => name.startsWith(dbName));

    expect(created).toHaveLength(1);

    sqlite.close();

    for (const name of created) {
      fs.rmSync(path.join(BACKUPS_PATH, name), { force: true });
    }
  });

  test('should not snapshot when server.backupDatabase is off', async () => {
    fs.mkdirSync(workDir, { recursive: true });

    const dbName = `no-backup-${Date.now()}.sqlite`;
    const sqlite = new Database(path.join(workDir, dbName), {
      create: true,
      strict: true
    });
    const db = drizzle({ client: sqlite });

    const original = config.server.backupDatabase;

    config.server.backupDatabase = false;
    testLogs.length = 0;

    try {
      await migrateDatabase(sqlite, db, SRC_MIGRATIONS_PATH);

      const created = fs
        .readdirSync(BACKUPS_PATH)
        .filter((name) => name.startsWith(dbName));

      expect(created).toHaveLength(0);
      expect(findTestLog('warn', 'server.backupDatabase off')).toBeDefined();
    } finally {
      config.server.backupDatabase = original;
      sqlite.close();
    }
  });

  test('should report rows left pointing at rows that do not exist', async () => {
    fs.mkdirSync(workDir, { recursive: true });

    const dbPath = path.join(workDir, `fk-check-${Date.now()}.sqlite`);
    const sqlite = new Database(dbPath, { create: true, strict: true });
    const db = drizzle({ client: sqlite });

    try {
      await migrateDatabase(sqlite, db, SRC_MIGRATIONS_PATH);

      expect(findTestLog('error', 'rows that do not exist')).toBeUndefined();

      sqlite.run('PRAGMA foreign_keys = OFF;');
      sqlite.run(
        `INSERT INTO channels (id, type, name, private, is_dm_channel, position, created_at)
         VALUES (1, 'TEXT', 'general', 0, 0, 0, 1)`
      );
      sqlite.run(
        `INSERT INTO messages (id, content, user_id, channel_id, created_at)
         VALUES (1, 'orphan', 999, 1, 1)`
      );
      sqlite.run('PRAGMA foreign_keys = ON;');

      await migrateDatabase(sqlite, db, SRC_MIGRATIONS_PATH);

      const reported = findTestLog('error', 'rows that do not exist');

      expect(reported).toBeDefined();
      expect(reported!.message).toContain('messages');
    } finally {
      sqlite.close();
    }
  });

  test('should not cascade away message relations when rebuilding a table', async () => {
    fs.mkdirSync(workDir, { recursive: true });

    const dbPath = path.join(workDir, `fk-${Date.now()}.sqlite`);
    const sqlite = new Database(dbPath, { create: true, strict: true });
    const db = drizzle({ client: sqlite });

    // bring the schema to the state a real server was on before the rebuild landed
    await migrateDatabase(
      sqlite,
      db,
      buildPartialMigrationsFolder(REBUILD_MIGRATION)
    );

    sqlite.run(
      `INSERT INTO channels (id, type, name, private, is_dm_channel, position, created_at)
       VALUES (1, 'TEXT', 'general', 0, 0, 0, 1)`
    );
    sqlite.run(
      `INSERT INTO users (id, identity, password, name, last_login_at, created_at)
       VALUES (1, 'reader', 'x', 'Reader', 1, 1)`
    );
    sqlite.run(
      `INSERT INTO files (id, name, original_name, md5, user_id, size, mime_type, extension, created_at)
       VALUES (1, 'a.png', 'a.png', 'md5', 1, 1, 'image/png', '.png', 1)`
    );
    sqlite.run(
      `INSERT INTO messages (id, content, user_id, channel_id, created_at)
       VALUES (1, 'root', 1, 1, 1), (2, 'reply', 1, 1, 2)`
    );
    sqlite.run(`UPDATE messages SET reply_to_message_id = 1 WHERE id = 2`);
    sqlite.run(
      `INSERT INTO message_files (message_id, file_id, created_at) VALUES (1, 1, 1)`
    );
    sqlite.run(
      `INSERT INTO message_reactions (message_id, user_id, emoji, created_at)
       VALUES (1, 1, '👍', 1)`
    );
    sqlite.run(
      `INSERT INTO channel_read_states (user_id, channel_id, last_read_message_id, last_read_at)
       VALUES (1, 1, 2, 1)`
    );

    // now the rest of the chain, through the helper every boot path uses
    await migrateDatabase(sqlite, db, SRC_MIGRATIONS_PATH);

    const count = (sql: string) => (sqlite.query(sql).get() as { c: number }).c;

    expect(count('SELECT COUNT(*) c FROM messages')).toBe(2);
    expect(count('SELECT COUNT(*) c FROM message_files')).toBe(1);
    expect(count('SELECT COUNT(*) c FROM message_reactions')).toBe(1);
    expect(
      count(
        'SELECT COUNT(*) c FROM messages WHERE reply_to_message_id IS NOT NULL'
      )
    ).toBe(1);
    expect(
      count(
        'SELECT COUNT(*) c FROM channel_read_states WHERE last_read_message_id IS NOT NULL'
      )
    ).toBe(1);

    sqlite.close();
  });
});

describe('repairing a database the old fork migrated', () => {
  // these open real files, which the server would back up before every run; config is
  // process wide, so it is put back when the file is done
  const backupDatabase = config.server.backupDatabase;

  beforeAll(() => {
    config.server.backupDatabase = false;
  });

  afterAll(() => {
    config.server.backupDatabase = backupDatabase;
  });

  const openOldForkDatabase = async () => {
    fs.mkdirSync(workDir, { recursive: true });

    const sqlite = new Database(
      path.join(workDir, `old-fork-${Date.now()}.sqlite`),
      { create: true, strict: true }
    );
    const db = drizzle({ client: sqlite });

    await migrateDatabase(sqlite, db, buildOldForkFolder());

    sqlite.run(
      `INSERT INTO users (id, identity, password, name, last_login_at, created_at, online_time_ms, voice_time_ms)
       VALUES (1, 'kept', 'x', 'Kept', 1, 1, 7200000, 1800000), (2, 'idle', 'x', 'Idle', 1, 1, 0, 0)`
    );

    return { sqlite, db };
  };

  const hasTable = (sqlite: Database, name: string) =>
    sqlite
      .query("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(name) !== null;

  test('should run the upstream migrations drizzle would have skipped', async () => {
    const { sqlite, db } = await openOldForkDatabase();

    testLogs.length = 0;
    await migrateDatabase(sqlite, db, SRC_MIGRATIONS_PATH);

    expect(findTestLog('info', 'Set the fork time totals aside')).toBeDefined();
    expect(
      findTestLog('info', 'Migration 0036_plugin_storage ran')
    ).toBeDefined();

    const messageColumns = sqlite
      .query('PRAGMA table_info(messages)')
      .all() as { name: string }[];

    expect(hasTable(sqlite, 'plugin_storage')).toBe(true);
    expect(hasTable(sqlite, 'thread_followers')).toBe(true);
    expect(messageColumns.map((column) => column.name)).toContain(
      'plugin_components'
    );
  });

  test('should keep the saved time totals', async () => {
    const { sqlite, db } = await openOldForkDatabase();

    await migrateDatabase(sqlite, db, SRC_MIGRATIONS_PATH);

    expect(
      sqlite
        .query(
          'SELECT id, online_time_ms, voice_time_ms FROM users ORDER BY id'
        )
        .all()
    ).toEqual([
      { id: 1, online_time_ms: 7200000, voice_time_ms: 1800000 },
      { id: 2, online_time_ms: 0, voice_time_ms: 0 }
    ]);
    expect(hasTable(sqlite, 'fork_time_totals_repair')).toBe(false);
  });

  test('should leave a repaired database alone on the next start', async () => {
    const { sqlite, db } = await openOldForkDatabase();

    await migrateDatabase(sqlite, db, SRC_MIGRATIONS_PATH);
    testLogs.length = 0;
    await migrateDatabase(sqlite, db, SRC_MIGRATIONS_PATH);

    expect(
      findTestLog('info', 'Set the fork time totals aside')
    ).toBeUndefined();
    expect(
      (
        sqlite.query('SELECT online_time_ms FROM users WHERE id = 1').get() as {
          online_time_ms: number;
        }
      ).online_time_ms
    ).toBe(7200000);
  });

  test('should finish the repair after a run that stopped part way', async () => {
    const { sqlite, db } = await openOldForkDatabase();

    // the totals are set aside, then the server stops before the migrations run
    sqlite.run(
      'CREATE TABLE fork_time_totals_repair AS SELECT id, online_time_ms, voice_time_ms FROM users'
    );
    sqlite.run('ALTER TABLE users DROP COLUMN online_time_ms');
    sqlite.run('ALTER TABLE users DROP COLUMN voice_time_ms');
    sqlite.run(
      'DELETE FROM __drizzle_migrations WHERE created_at = 1792141087404'
    );

    await migrateDatabase(sqlite, db, SRC_MIGRATIONS_PATH);

    expect(
      (
        sqlite.query('SELECT voice_time_ms FROM users WHERE id = 1').get() as {
          voice_time_ms: number;
        }
      ).voice_time_ms
    ).toBe(1800000);
    expect(hasTable(sqlite, 'fork_time_totals_repair')).toBe(false);
  });

  test('should not touch a database that never ran the old fork', async () => {
    fs.mkdirSync(workDir, { recursive: true });

    const sqlite = new Database(
      path.join(workDir, `fresh-${Date.now()}.sqlite`),
      {
        create: true,
        strict: true
      }
    );
    const db = drizzle({ client: sqlite });

    testLogs.length = 0;
    await migrateDatabase(sqlite, db, SRC_MIGRATIONS_PATH);

    expect(
      findTestLog('info', 'Set the fork time totals aside')
    ).toBeUndefined();
    expect(hasTable(sqlite, 'plugin_storage')).toBe(true);
  });
});

describe('the old fork unlimited max file size', () => {
  const runMigration = () => {
    const statement = fs.readFileSync(
      path.join(SRC_MIGRATIONS_PATH, '0040_old_unlimited_file_size_to_max.sql'),
      'utf-8'
    );

    tdb.run(sql.raw(statement));
  };

  const maxFileSize = () => {
    const row = tdb
      .select({ value: settings.storageUploadMaxFileSize })
      .from(settings)
      .get();

    return row?.value;
  };

  test('should become the largest limit upstream allows', () => {
    tdb.update(settings).set({ storageUploadMaxFileSize: 0 }).run();

    runMigration();

    expect(maxFileSize()).toBe(STORAGE_MAX_FILE_SIZE);
  });

  test('should leave a real limit alone', () => {
    tdb
      .update(settings)
      .set({ storageUploadMaxFileSize: 25 * 1024 * 1024 })
      .run();

    runMigration();

    expect(maxFileSize()).toBe(25 * 1024 * 1024);
  });
});
