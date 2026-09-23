import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';

import { useRepositories } from '../../../database/useRepositories';
import { useAsyncResource } from '../../../hooks/useAsyncResource';
import { logError, toUserMessage } from '../../../services/errors';
import type { RepertoireEntry, Song } from '../../../types';
import { clampCapo } from '../../chords';
import { stepKey } from '../playback';

interface ViewerData {
  song: Song | null;
  entry: RepertoireEntry | null;
  entries: RepertoireEntry[];
}

interface KeyCapoPatch {
  key?: string | null;
  capo?: number | null;
}

/**
 * State for the chord viewer. In library mode key/capo changes are saved on
 * the song; when opened from a repertoire (entryId) they are saved only on
 * that repertoire entry, leaving the library defaults untouched.
 */
export function useSongViewer(songId: string, entryId?: string) {
  const { songs, repertoires } = useRepositories();

  const resource = useAsyncResource<ViewerData>(
    useCallback(async () => {
      const [song, entry] = await Promise.all([
        songs.getById(songId),
        entryId ? repertoires.getEntry(entryId) : Promise.resolve(null),
      ]);
      const entries = entry ? await repertoires.listEntries(entry.repertoireId) : [];
      return { song, entry, entries };
    }, [songs, repertoires, songId, entryId]),
  );

  const { data, mutate, reload } = resource;
  const song = data?.song ?? null;
  const entry = data?.entry ?? null;
  const soundingKey = (entry ? entry.key : null) ?? song?.currentKey ?? 'C';
  const capo = (entry ? entry.capo : null) ?? song?.capo ?? 0;

  /** Optimistically applies the change, then persists it in the right place. */
  const update = useCallback(
    async (patch: KeyCapoPatch) => {
      if (!song) return;
      try {
        if (entry) {
          const next = {
            key: patch.key !== undefined ? patch.key : entry.key,
            capo: patch.capo !== undefined ? patch.capo : entry.capo,
          };
          mutate((current) => ({ ...current, entry: current.entry && { ...current.entry, ...next } }));
          await repertoires.updateEntryOverrides(entry.id, next);
        } else {
          const nextKey = patch.key ?? song.currentKey;
          const nextCapo = patch.capo ?? song.capo;
          mutate((current) => ({
            ...current,
            song: current.song && { ...current.song, currentKey: nextKey, capo: nextCapo },
          }));
          if (patch.key !== undefined) await songs.setCurrentKey(song.id, nextKey);
          if (patch.capo !== undefined) await songs.setCapo(song.id, nextCapo);
        }
      } catch (error) {
        logError('persistViewerSettings', error);
        Alert.alert('Não foi possível salvar', toUserMessage(error));
        await reload();
      }
    },
    [entry, mutate, reload, repertoires, song, songs],
  );

  const transpose = useCallback(
    (delta: number) => {
      if (song) void update({ key: stepKey(soundingKey, delta, song.originalKey) });
    },
    [song, soundingKey, update],
  );

  // In a repertoire, "reset" goes back to the library key; in the library, to the original key.
  const resetKey = useCallback(() => {
    if (song) void update({ key: entry ? null : song.originalKey });
  }, [entry, song, update]);

  const changeCapo = useCallback((value: number) => void update({ capo: clampCapo(value) }), [update]);

  const toggleFavorite = useCallback(async () => {
    if (!song) return;
    const favorite = !song.favorite;
    mutate((current) => ({ ...current, song: current.song && { ...current.song, favorite } }));
    try {
      await songs.setFavorite(song.id, favorite);
    } catch (error) {
      logError('toggleFavorite', error);
      Alert.alert('Favoritos', toUserMessage(error));
      await reload();
    }
  }, [mutate, reload, song, songs]);

  const navigation = useMemo(() => {
    const entries = data?.entries ?? [];
    const index = entry ? entries.findIndex((e) => e.id === entry.id) : -1;
    return {
      entries,
      index,
      previous: index > 0 ? entries[index - 1] : null,
      next: index >= 0 && index < entries.length - 1 ? entries[index + 1] : null,
    };
  }, [data?.entries, entry]);

  return {
    loading: resource.loading && !data,
    error: resource.error,
    reload,
    notFound: data !== undefined && data.song === null,
    song,
    entry,
    soundingKey,
    capo,
    isKeyOverridden: entry ? entry.key !== null : song ? song.currentKey !== song.originalKey : false,
    transpose,
    resetKey,
    changeCapo,
    toggleFavorite,
    navigation,
  };
}
