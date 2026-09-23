import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppText,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingView,
  MAX_CONTENT_WIDTH,
} from '../../../components';
import { useRepositories } from '../../../database/useRepositories';
import { useAsyncResource } from '../../../hooks/useAsyncResource';
import { formatShortDate } from '../../../services/dates';
import { logError, toUserMessage } from '../../../services/errors';
import { spacing, useTheme } from '../../../theme';
import type { RepertoireEntry } from '../../../types';
import { EntryRow } from '../components/EntryRow';
import { moveItem } from '../reorder';

const EMPTY: RepertoireEntry[] = [];

export function RepertoireDetailScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repertoires } = useRepositories();
  const [editing, setEditing] = useState(false);

  const { data, loading, error, reload, mutate } = useAsyncResource(
    useCallback(async () => {
      const [repertoire, list] = await Promise.all([repertoires.getById(id), repertoires.listEntries(id)]);
      return { repertoire, entries: list };
    }, [repertoires, id]),
  );

  const entries = data?.entries ?? EMPTY;

  const openEntry = useCallback(
    (entry: RepertoireEntry) =>
      router.push({ pathname: '/song/[id]', params: { id: entry.songId, entryId: entry.id } }),
    [router],
  );

  const openOptions = useCallback(
    (entry: RepertoireEntry) => router.push({ pathname: '/repertoire/entry', params: { entryId: entry.id } }),
    [router],
  );

  const move = useCallback(
    async (index: number, direction: -1 | 1) => {
      const next = moveItem(entries, index, index + direction);
      mutate((current) => ({ ...current, entries: next }));
      try {
        await repertoires.reorder(
          id,
          next.map((entry) => entry.id),
        );
      } catch (err) {
        logError('reorder', err);
        Alert.alert('Não foi possível reordenar', toUserMessage(err));
        await reload();
      }
    },
    [entries, id, mutate, reload, repertoires],
  );

  const remove = useCallback(
    (entry: RepertoireEntry) => {
      Alert.alert('Remover música', `Remover "${entry.song.title}" deste repertório?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            mutate((current) => ({ ...current, entries: current.entries.filter((e) => e.id !== entry.id) }));
            try {
              await repertoires.removeEntry(entry.id);
            } catch (err) {
              logError('removeEntry', err);
              Alert.alert('Não foi possível remover', toUserMessage(err));
            }
            await reload();
          },
        },
      ]);
    },
    [mutate, reload, repertoires],
  );

  const headerRight = useCallback(
    () => (
      <View style={styles.headerActions}>
        {entries.length > 0 ? (
          <Button
            label={editing ? 'Concluir' : 'Organizar'}
            variant="ghost"
            onPress={() => setEditing((value) => !value)}
          />
        ) : null}
        <IconButton
          icon="create-outline"
          onPress={() => router.push({ pathname: '/repertoire/edit', params: { id } })}
          accessibilityLabel="Editar repertório"
        />
      </View>
    ),
    [editing, entries.length, id, router],
  );

  if (loading && !data) return <LoadingView />;
  if (error && !data) return <ErrorState message={toUserMessage(error)} onRetry={reload} />;
  if (!data?.repertoire) {
    return (
      <EmptyState
        icon="list-outline"
        title="Repertório não encontrado"
        actionLabel="Voltar"
        onAction={() => router.back()}
      />
    );
  }

  const { repertoire } = data;
  const addSongs = () =>
    router.push({ pathname: '/repertoire/add-songs', params: { repertoireId: repertoire.id } });

  return (
    <SafeAreaView edges={['bottom']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: '', headerRight }} />
      <FlatList
        style={styles.flex}
        contentContainerStyle={[styles.content, entries.length === 0 && styles.flexGrow]}
        data={entries}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="display">{repertoire.name}</AppText>
            <AppText color="textMuted">
              {[
                repertoire.date ? formatShortDate(repertoire.date) : null,
                `${entries.length} ${entries.length === 1 ? 'música' : 'músicas'}`,
              ]
                .filter(Boolean)
                .join('  ·  ')}
            </AppText>
            {entries.length > 0 && !editing ? (
              <Button
                label="Começar pela primeira"
                icon="play"
                onPress={() => openEntry(entries[0])}
                style={styles.play}
              />
            ) : null}
            {editing ? (
              <AppText variant="caption" color="textMuted">
                Use as setas para mudar a ordem. Toque na música para ajustar tom e capo.
              </AppText>
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => (
          <EntryRow
            entry={item}
            index={index}
            total={entries.length}
            editing={editing}
            onOpen={openEntry}
            onOptions={openOptions}
            onMove={move}
            onRemove={remove}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="musical-notes-outline"
            title="Repertório vazio"
            message="Adicione músicas da sua biblioteca."
          />
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Button label="Adicionar músicas" icon="add" variant="secondary" onPress={addSongs} />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexGrow: { flexGrow: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  content: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', paddingBottom: spacing.xxxl },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
  play: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  footer: { padding: spacing.lg },
});
