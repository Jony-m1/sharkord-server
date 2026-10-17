import type { Database } from 'bun:sqlite';
import { logger } from '../logger';

// before it was rebuilt on upstream 0.0.28, this fork shipped its time totals as migration
// 0036_user_time_totals. upstream then used 0036 and 0037 for its own tables, stamped earlier
// than the fork's, and drizzle only runs migrations stamped after the newest one applied, so a
// database that ran the fork's would silently skip both. its entry is forgotten and its two
// columns set aside, so every upstream migration runs and 0039 adds the columns back
const OLD_TIME_TOTALS_MIGRATION_CREATED_AT = 1792141087404;
const SAVED_TOTALS_TABLE = 'fork_time_totals_repair';

const hasOldForkMigration = (sqlite: Database) => {
  try {
    const row = sqlite
      .query('SELECT 1 FROM __drizzle_migrations WHERE created_at = ?')
      .get(OLD_TIME_TOTALS_MIGRATION_CREATED_AT);

    return row !== null;
  } catch {
    // no migrations table yet: a new database
    return false;
  }
};

const setForkTimeTotalsAside = (sqlite: Database) => {
  sqlite.transaction(() => {
    sqlite.run(
      `CREATE TABLE ${SAVED_TOTALS_TABLE} AS SELECT id, online_time_ms, voice_time_ms FROM users`
    );
    sqlite.run('ALTER TABLE users DROP COLUMN online_time_ms');
    sqlite.run('ALTER TABLE users DROP COLUMN voice_time_ms');
    sqlite.run('DELETE FROM __drizzle_migrations WHERE created_at = ?', [
      OLD_TIME_TOTALS_MIGRATION_CREATED_AT
    ]);
  })();

  logger.info(
    'Set the fork time totals aside so the skipped upstream migrations can run'
  );
};

// after the migrations, which have added the columns back. also picks up a run that stopped
// between the two steps, since the saved table outlives a failed or interrupted migration
const restoreForkTimeTotals = (sqlite: Database) => {
  const saved = sqlite
    .query("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(SAVED_TOTALS_TABLE);

  if (!saved) return;

  sqlite.transaction(() => {
    sqlite.run(
      `UPDATE users
       SET online_time_ms = saved.online_time_ms, voice_time_ms = saved.voice_time_ms
       FROM ${SAVED_TOTALS_TABLE} AS saved
       WHERE saved.id = users.id`
    );
    sqlite.run(`DROP TABLE ${SAVED_TOTALS_TABLE}`);
  })();

  logger.info('Restored the fork time totals');
};

export { hasOldForkMigration, restoreForkTimeTotals, setForkTimeTotalsAside };
