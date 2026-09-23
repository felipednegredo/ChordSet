import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import { createRepertoireRepository } from '../features/repertoires/repertoireRepository';
import { createSongRepository } from '../features/songs/songRepository';
import type { RepertoireRepository, SongRepository } from '../types';

export interface Repositories {
  songs: SongRepository;
  repertoires: RepertoireRepository;
}

/** Screens get data access through this hook instead of writing SQL. */
export function useRepositories(): Repositories {
  const db = useSQLiteContext();
  return useMemo(
    () => ({ songs: createSongRepository(db), repertoires: createRepertoireRepository(db) }),
    [db],
  );
}
