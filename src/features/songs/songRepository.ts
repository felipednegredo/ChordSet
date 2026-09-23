import type { SQLiteDatabase } from 'expo-sqlite';

import { mapSong, mapSongSummary, type SongRow, type SongSummaryRow } from '../../database/rows';
import { nowIso } from '../../services/dates';
import { NotFoundError } from '../../services/errors';
import { createId } from '../../services/id';
import { normalizeForSearch } from '../../services/text';
import type { Song, SongQuery, SongRepository, SongSummary } from '../../types';
import { validateSongInput } from './songValidation';

const SUMMARY_COLUMNS =
  'id, title, artist, original_key, current_key, capo, favorite, created_at, updated_at';

function matches(song: SongSummary, text: string, field: SongQuery['field']): boolean {
  const title = normalizeForSearch(song.title);
  const artist = normalizeForSearch(song.artist);
  if (field === 'title') return title.includes(text);
  if (field === 'artist') return artist.includes(text);
  return title.includes(text) || artist.includes(text);
}

/** SQLite implementation of {@link SongRepository}. */
export function createSongRepository(db: SQLiteDatabase): SongRepository {
  async function getByIdOrThrow(id: string): Promise<Song> {
    const row = await db.getFirstAsync<SongRow>('SELECT * FROM songs WHERE id = ?', id);
    if (!row) throw new NotFoundError('Cifra', id);
    return mapSong(row);
  }

  return {
    async list(query = {}) {
      const where = query.favoritesOnly ? 'WHERE favorite = 1' : '';
      const rows = await db.getAllAsync<SongSummaryRow>(
        `SELECT ${SUMMARY_COLUMNS} FROM songs ${where} ORDER BY title COLLATE NOCASE ASC`,
      );
      const songs = rows.map(mapSongSummary);
      const text = normalizeForSearch(query.text ?? '');
      // Filtering in JS keeps searches accent-insensitive (SQLite LIKE is ASCII-only).
      return text ? songs.filter((song) => matches(song, text, query.field ?? 'all')) : songs;
    },

    async getById(id) {
      const row = await db.getFirstAsync<SongRow>('SELECT * FROM songs WHERE id = ?', id);
      return row ? mapSong(row) : null;
    },

    async create(input) {
      const data = validateSongInput(input);
      const id = createId();
      const now = nowIso();
      await db.runAsync(
        `INSERT INTO songs (id, title, artist, original_key, current_key, capo, content, favorite, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        data.title,
        data.artist,
        data.originalKey,
        data.currentKey,
        data.capo,
        data.content,
        data.favorite ? 1 : 0,
        now,
        now,
      );
      return getByIdOrThrow(id);
    },

    async update(id, input) {
      const data = validateSongInput(input);
      const result = await db.runAsync(
        `UPDATE songs SET title = ?, artist = ?, original_key = ?, current_key = ?, capo = ?, content = ?,
         favorite = COALESCE(?, favorite), updated_at = ? WHERE id = ?`,
        data.title,
        data.artist,
        data.originalKey,
        data.currentKey,
        data.capo,
        data.content,
        input.favorite === undefined ? null : input.favorite ? 1 : 0,
        nowIso(),
        id,
      );
      if (result.changes === 0) throw new NotFoundError('Cifra', id);
      return getByIdOrThrow(id);
    },

    async setFavorite(id, favorite) {
      await db.runAsync(
        'UPDATE songs SET favorite = ?, updated_at = ? WHERE id = ?',
        favorite ? 1 : 0,
        nowIso(),
        id,
      );
    },

    async setCurrentKey(id, key) {
      await db.runAsync('UPDATE songs SET current_key = ?, updated_at = ? WHERE id = ?', key, nowIso(), id);
    },

    async setCapo(id, capo) {
      await db.runAsync('UPDATE songs SET capo = ?, updated_at = ? WHERE id = ?', capo, nowIso(), id);
    },

    async remove(id) {
      await db.runAsync('DELETE FROM songs WHERE id = ?', id);
    },
  };
}
