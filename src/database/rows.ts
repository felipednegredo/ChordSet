import type { Repertoire, RepertoireEntry, Song, SongSummary } from '../types';

/** Raw row shapes as stored in SQLite (snake_case, integers for booleans). */

export interface SongRow {
  id: string;
  title: string;
  artist: string;
  original_key: string;
  current_key: string;
  capo: number;
  content: string;
  rhythm: string;
  tempo: number | null;
  favorite: number;
  created_at: string;
  updated_at: string;
}

export type SongSummaryRow = Omit<SongRow, 'content' | 'rhythm' | 'tempo'>;

export interface RepertoireRow {
  id: string;
  name: string;
  date: string | null;
  created_at: string;
  updated_at: string;
}

export interface RepertoireEntryRow {
  entry_id: string;
  repertoire_id: string;
  song_id: string;
  position: number;
  entry_key: string | null;
  entry_capo: number | null;
}

export function mapSongSummary(row: SongSummaryRow): SongSummary {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    originalKey: row.original_key,
    currentKey: row.current_key,
    capo: row.capo,
    favorite: row.favorite === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSong(row: SongRow): Song {
  return { ...mapSongSummary(row), content: row.content, rhythm: row.rhythm, tempo: row.tempo };
}

export function mapRepertoire(row: RepertoireRow): Repertoire {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRepertoireEntry(row: RepertoireEntryRow & SongSummaryRow): RepertoireEntry {
  return {
    id: row.entry_id,
    repertoireId: row.repertoire_id,
    songId: row.song_id,
    position: row.position,
    key: row.entry_key,
    capo: row.entry_capo,
    song: mapSongSummary(row),
  };
}
