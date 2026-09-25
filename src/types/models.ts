/** Domain models shared across features. Dates are ISO-8601 strings. */

export interface Song {
  id: string;
  title: string;
  artist: string;
  /** Key in which `content` is written. */
  originalKey: string;
  /** Key the musician wants to play by default (library setting). */
  currentKey: string;
  capo: number;
  /** Chord sheet in ChordPro-like format. */
  content: string;
  /** Strumming pattern in text notation (see `features/rhythm/pattern.ts`), '' when unset. */
  rhythm: string;
  /** Tempo in BPM for the strumming pattern, null when unset. */
  tempo: number | null;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SongSummary = Omit<Song, 'content' | 'rhythm' | 'tempo'>;

export interface SongInput {
  title: string;
  artist: string;
  originalKey: string;
  currentKey: string;
  capo: number;
  content: string;
  rhythm?: string;
  tempo?: number | null;
  favorite?: boolean;
}

export type SongSearchField = 'all' | 'title' | 'artist';

export interface SongQuery {
  text?: string;
  field?: SongSearchField;
  favoritesOnly?: boolean;
}

export interface Repertoire {
  id: string;
  name: string;
  /** Optional event date, `YYYY-MM-DD`. */
  date: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RepertoireSummary extends Repertoire {
  songCount: number;
}

export interface RepertoireInput {
  name: string;
  date: string | null;
}

/** A song inside a repertoire. `key`/`capo` override the library values only for this setlist. */
export interface RepertoireEntry {
  id: string;
  repertoireId: string;
  songId: string;
  position: number;
  key: string | null;
  capo: number | null;
  song: SongSummary;
}

export interface RepertoireEntryOverrides {
  key: string | null;
  capo: number | null;
}
