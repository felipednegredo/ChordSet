import type { SQLiteDatabase } from 'expo-sqlite';

import { type Migration, MIGRATIONS } from './migrations';
import { AppError } from '../services/errors';

/**
 * Applies pending migrations using SQLite's `PRAGMA user_version` as the
 * schema version. Each migration runs in its own transaction.
 */
export async function runMigrations(
  db: SQLiteDatabase,
  migrations: Migration[] = MIGRATIONS,
): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = row?.user_version ?? 0;

  const pending = [...migrations]
    .sort((a, b) => a.version - b.version)
    .filter((m) => m.version > currentVersion);

  for (const migration of pending) {
    try {
      await db.withTransactionAsync(async () => {
        await migration.up(db);
        // PRAGMA does not accept bound parameters; version is a trusted integer.
        await db.execAsync(`PRAGMA user_version = ${Math.floor(migration.version)}`);
      });
      currentVersion = migration.version;
    } catch (error) {
      throw new AppError(`Falha ao atualizar o banco (migração ${migration.name}).`, 'database', error);
    }
  }
  return currentVersion;
}

/** Called by `<SQLiteProvider onInit>` before any screen touches the database. */
export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await runMigrations(db);
}
