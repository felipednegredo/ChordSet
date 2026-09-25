import type {
  Repertoire,
  RepertoireEntry,
  RepertoireEntryOverrides,
  RepertoireInput,
  RepertoireSummary,
  Song,
  SongInput,
  SongQuery,
  SongSummary,
} from './models';

/**
 * Repository contracts. The app talks to these interfaces only, so a future
 * cloud-synced or remote implementation can replace the SQLite one.
 */
export interface SongRepository {
  list(query?: SongQuery): Promise<SongSummary[]>;
  getById(id: string): Promise<Song | null>;
  create(input: SongInput): Promise<Song>;
  update(id: string, input: SongInput): Promise<Song>;
  setFavorite(id: string, favorite: boolean): Promise<void>;
  setCurrentKey(id: string, key: string): Promise<void>;
  setCapo(id: string, capo: number): Promise<void>;
  setRhythm(id: string, rhythm: string, tempo: number | null): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface RepertoireRepository {
  list(): Promise<RepertoireSummary[]>;
  getById(id: string): Promise<Repertoire | null>;
  create(input: RepertoireInput): Promise<Repertoire>;
  update(id: string, input: RepertoireInput): Promise<Repertoire>;
  remove(id: string): Promise<void>;

  listEntries(repertoireId: string): Promise<RepertoireEntry[]>;
  getEntry(entryId: string): Promise<RepertoireEntry | null>;
  addSongs(repertoireId: string, songIds: string[]): Promise<void>;
  removeEntry(entryId: string): Promise<void>;
  /** Persists a new order. `entryIds` must contain every entry of the repertoire. */
  reorder(repertoireId: string, entryIds: string[]): Promise<void>;
  updateEntryOverrides(entryId: string, overrides: RepertoireEntryOverrides): Promise<void>;
  /** Repertoires that already contain the song (used by "add to repertoire"). */
  listIdsContainingSong(songId: string): Promise<string[]>;
}
