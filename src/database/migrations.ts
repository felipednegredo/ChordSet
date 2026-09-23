import type { SQLiteDatabase } from 'expo-sqlite';

import { SEED_SONGS } from './seed';
import { createId } from '../services/id';
import { nowIso } from '../services/dates';

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
}

/**
 * Ordered list of schema migrations. Never edit a migration that has shipped:
 * add a new one with the next version number instead.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS songs (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          artist TEXT NOT NULL DEFAULT '',
          original_key TEXT NOT NULL,
          current_key TEXT NOT NULL,
          capo INTEGER NOT NULL DEFAULT 0 CHECK (capo BETWEEN 0 AND 11),
          content TEXT NOT NULL DEFAULT '',
          favorite INTEGER NOT NULL DEFAULT 0 CHECK (favorite IN (0, 1)),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_songs_title ON songs (title COLLATE NOCASE);
        CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs (artist COLLATE NOCASE);
        CREATE INDEX IF NOT EXISTS idx_songs_favorite ON songs (favorite);

        CREATE TABLE IF NOT EXISTS repertoires (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          date TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS repertoire_songs (
          id TEXT PRIMARY KEY NOT NULL,
          repertoire_id TEXT NOT NULL REFERENCES repertoires (id) ON DELETE CASCADE,
          song_id TEXT NOT NULL REFERENCES songs (id) ON DELETE CASCADE,
          position INTEGER NOT NULL,
          key TEXT,
          capo INTEGER CHECK (capo IS NULL OR capo BETWEEN 0 AND 11)
        );
        CREATE INDEX IF NOT EXISTS idx_repertoire_songs_repertoire
          ON repertoire_songs (repertoire_id, position);
        CREATE INDEX IF NOT EXISTS idx_repertoire_songs_song ON repertoire_songs (song_id);
      `);
    },
  },
  {
    version: 2,
    name: 'seed_example_songs',
    up: async (db) => {
      const existing = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) AS total FROM songs');
      if ((existing?.total ?? 0) > 0) return;
      const now = nowIso();
      for (const song of SEED_SONGS) {
        await db.runAsync(
          `INSERT INTO songs (id, title, artist, original_key, current_key, capo, content, favorite, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          createId(),
          song.title,
          song.artist,
          song.originalKey,
          song.currentKey,
          song.capo,
          song.content,
          song.favorite ? 1 : 0,
          now,
          now,
        );
      }
    },
  },
];
