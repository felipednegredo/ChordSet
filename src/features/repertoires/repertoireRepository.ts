import type { SQLiteDatabase } from 'expo-sqlite';

import {
  mapRepertoire,
  mapRepertoireEntry,
  type RepertoireEntryRow,
  type RepertoireRow,
  type SongSummaryRow,
} from '../../database/rows';
import { nowIso } from '../../services/dates';
import { NotFoundError, ValidationError } from '../../services/errors';
import { createId } from '../../services/id';
import type { RepertoireInput, RepertoireRepository, RepertoireSummary } from '../../types';
import { clampCapo, isValidKey } from '../chords';

const ENTRY_SELECT = `
  SELECT rs.id AS entry_id, rs.repertoire_id, rs.song_id, rs.position,
         rs.key AS entry_key, rs.capo AS entry_capo,
         s.id, s.title, s.artist, s.original_key, s.current_key, s.capo, s.favorite, s.created_at, s.updated_at
  FROM repertoire_songs rs
  JOIN songs s ON s.id = rs.song_id`;

function validateInput(input: RepertoireInput): RepertoireInput {
  const name = input.name.trim();
  if (!name) throw new ValidationError('Informe o nome do repertório.');
  if (input.date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new ValidationError('Data inválida.');
  }
  return { name, date: input.date };
}

/** SQLite implementation of {@link RepertoireRepository}. */
export function createRepertoireRepository(db: SQLiteDatabase): RepertoireRepository {
  const touch = (repertoireId: string) =>
    db.runAsync('UPDATE repertoires SET updated_at = ? WHERE id = ?', nowIso(), repertoireId);

  const repository: RepertoireRepository = {
    async list() {
      const rows = await db.getAllAsync<RepertoireRow & { song_count: number }>(`
        SELECT r.*, (SELECT COUNT(*) FROM repertoire_songs rs WHERE rs.repertoire_id = r.id) AS song_count
        FROM repertoires r
        ORDER BY CASE WHEN r.date IS NULL THEN 1 ELSE 0 END, r.date DESC, r.created_at DESC`);
      return rows.map<RepertoireSummary>((row) => ({ ...mapRepertoire(row), songCount: row.song_count }));
    },

    async getById(id) {
      const row = await db.getFirstAsync<RepertoireRow>('SELECT * FROM repertoires WHERE id = ?', id);
      return row ? mapRepertoire(row) : null;
    },

    async create(input) {
      const data = validateInput(input);
      const id = createId();
      const now = nowIso();
      await db.runAsync(
        'INSERT INTO repertoires (id, name, date, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        id,
        data.name,
        data.date,
        now,
        now,
      );
      return { id, name: data.name, date: data.date, createdAt: now, updatedAt: now };
    },

    async update(id, input) {
      const data = validateInput(input);
      const result = await db.runAsync(
        'UPDATE repertoires SET name = ?, date = ?, updated_at = ? WHERE id = ?',
        data.name,
        data.date,
        nowIso(),
        id,
      );
      if (result.changes === 0) throw new NotFoundError('Repertório', id);
      const updated = await repository.getById(id);
      if (!updated) throw new NotFoundError('Repertório', id);
      return updated;
    },

    async remove(id) {
      await db.runAsync('DELETE FROM repertoires WHERE id = ?', id);
    },

    async listEntries(repertoireId) {
      const rows = await db.getAllAsync<RepertoireEntryRow & SongSummaryRow>(
        `${ENTRY_SELECT} WHERE rs.repertoire_id = ? ORDER BY rs.position ASC`,
        repertoireId,
      );
      return rows.map(mapRepertoireEntry);
    },

    async getEntry(entryId) {
      const row = await db.getFirstAsync<RepertoireEntryRow & SongSummaryRow>(
        `${ENTRY_SELECT} WHERE rs.id = ?`,
        entryId,
      );
      return row ? mapRepertoireEntry(row) : null;
    },

    async addSongs(repertoireId, songIds) {
      if (songIds.length === 0) return;
      await db.withTransactionAsync(async () => {
        const row = await db.getFirstAsync<{ max_position: number | null }>(
          'SELECT MAX(position) AS max_position FROM repertoire_songs WHERE repertoire_id = ?',
          repertoireId,
        );
        let position = (row?.max_position ?? -1) + 1;
        for (const songId of songIds) {
          await db.runAsync(
            'INSERT INTO repertoire_songs (id, repertoire_id, song_id, position, key, capo) VALUES (?, ?, ?, ?, NULL, NULL)',
            createId(),
            repertoireId,
            songId,
            position,
          );
          position += 1;
        }
        await touch(repertoireId);
      });
    },

    async removeEntry(entryId) {
      const entry = await db.getFirstAsync<{ repertoire_id: string }>(
        'SELECT repertoire_id FROM repertoire_songs WHERE id = ?',
        entryId,
      );
      if (!entry) return;
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM repertoire_songs WHERE id = ?', entryId);
        // Keep positions contiguous (0..n-1) so ordering stays predictable.
        const remaining = await db.getAllAsync<{ id: string }>(
          'SELECT id FROM repertoire_songs WHERE repertoire_id = ? ORDER BY position ASC',
          entry.repertoire_id,
        );
        for (let index = 0; index < remaining.length; index += 1) {
          await db.runAsync(
            'UPDATE repertoire_songs SET position = ? WHERE id = ?',
            index,
            remaining[index].id,
          );
        }
        await touch(entry.repertoire_id);
      });
    },

    async reorder(repertoireId, entryIds) {
      await db.withTransactionAsync(async () => {
        const existing = await db.getAllAsync<{ id: string }>(
          'SELECT id FROM repertoire_songs WHERE repertoire_id = ?',
          repertoireId,
        );
        const known = new Set(existing.map((row) => row.id));
        if (known.size !== entryIds.length || !entryIds.every((id) => known.has(id))) {
          throw new ValidationError('A lista de músicas mudou. Atualize e tente novamente.');
        }
        for (let index = 0; index < entryIds.length; index += 1) {
          await db.runAsync('UPDATE repertoire_songs SET position = ? WHERE id = ?', index, entryIds[index]);
        }
        await touch(repertoireId);
      });
    },

    async updateEntryOverrides(entryId, overrides) {
      if (overrides.key !== null && !isValidKey(overrides.key)) throw new ValidationError('Tom inválido.');
      const capo = overrides.capo === null ? null : clampCapo(overrides.capo);
      await db.runAsync(
        'UPDATE repertoire_songs SET key = ?, capo = ? WHERE id = ?',
        overrides.key,
        capo,
        entryId,
      );
    },

    async listIdsContainingSong(songId) {
      const rows = await db.getAllAsync<{ repertoire_id: string }>(
        'SELECT DISTINCT repertoire_id FROM repertoire_songs WHERE song_id = ?',
        songId,
      );
      return rows.map((row) => row.repertoire_id);
    },
  };

  return repository;
}
