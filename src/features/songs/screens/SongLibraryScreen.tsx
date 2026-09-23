import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';

import {
  Chip,
  EmptyState,
  ErrorState,
  Fab,
  IconButton,
  LoadingView,
  Screen,
  ScreenHeader,
  SearchField,
  SegmentedControl,
} from '../../../components';
import { useRepositories } from '../../../database/useRepositories';
import { useAsyncResource } from '../../../hooks/useAsyncResource';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { logError, toUserMessage } from '../../../services/errors';
import { spacing } from '../../../theme';
import type { SongSearchField, SongSummary } from '../../../types';
import { SongListItem } from '../components/SongListItem';

export function SongLibraryScreen() {
  const router = useRouter();
  const { songs } = useRepositories();
  const [text, setText] = useState('');
  const [field, setField] = useState<SongSearchField>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const query = useDebouncedValue(text, 150);

  const { data, loading, error, reload } = useAsyncResource(
    useCallback(
      () => songs.list({ text: query, field, favoritesOnly }),
      [songs, query, field, favoritesOnly],
    ),
  );

  const openSong = useCallback(
    (song: SongSummary) => router.push({ pathname: '/song/[id]', params: { id: song.id } }),
    [router],
  );

  const toggleFavorite = useCallback(
    async (song: SongSummary) => {
      try {
        await songs.setFavorite(song.id, !song.favorite);
        await reload();
      } catch (err) {
        logError('toggleFavorite', err);
        Alert.alert('Favoritos', toUserMessage(err));
      }
    },
    [songs, reload],
  );

  const renderEmpty = () => {
    if (text)
      return <EmptyState icon="search" title="Nada encontrado" message={`Nenhuma cifra para "${text}".`} />;
    if (favoritesOnly)
      return (
        <EmptyState
          icon="star-outline"
          title="Sem favoritas ainda"
          message="Toque na estrela de uma música para encontrá-la rápido aqui."
        />
      );
    return (
      <EmptyState
        icon="musical-notes-outline"
        title="Sua biblioteca está vazia"
        message="Adicione a primeira cifra colando o texto no formato ChordPro ou com acordes em cima da letra."
        actionLabel="Adicionar cifra"
        onAction={() => router.push('/song/new')}
      />
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <ScreenHeader
          eyebrow="ChordSet"
          title="Cifras"
          actions={
            <IconButton
              icon="settings-outline"
              onPress={() => router.push('/settings')}
              accessibilityLabel="Ajustes"
            />
          }
        />
        <SearchField value={text} onChangeText={setText} placeholder="Buscar por título ou artista" />
        <View style={styles.filters}>
          <Chip label="Todas" selected={!favoritesOnly} onPress={() => setFavoritesOnly(false)} />
          <Chip
            label="Favoritas"
            icon="star"
            selected={favoritesOnly}
            onPress={() => setFavoritesOnly(true)}
          />
        </View>
        {text ? (
          <SegmentedControl<SongSearchField>
            options={[
              { value: 'all', label: 'Tudo' },
              { value: 'title', label: 'Título' },
              { value: 'artist', label: 'Artista' },
            ]}
            value={field}
            onChange={setField}
          />
        ) : null}
      </View>

      {loading && !data ? (
        <LoadingView />
      ) : error && !data ? (
        <ErrorState message={toUserMessage(error)} onRetry={reload} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SongListItem song={item} onPress={openSong} onToggleFavorite={toggleFavorite} />
          )}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[styles.list, (data ?? []).length === 0 && styles.emptyList]}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <Fab icon="add" label="Nova cifra" onPress={() => router.push('/song/new')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  filters: { flexDirection: 'row', gap: spacing.sm },
  list: { paddingBottom: 120 },
  emptyList: { flexGrow: 1 },
});
