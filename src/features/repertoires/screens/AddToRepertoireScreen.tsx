import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Icon, LoadingView, MAX_CONTENT_WIDTH, TextField } from '../../../components';
import { useRepositories } from '../../../database/useRepositories';
import { useAsyncResource } from '../../../hooks/useAsyncResource';
import { formatShortDate } from '../../../services/dates';
import { logError, toUserMessage } from '../../../services/errors';
import { spacing, useTheme } from '../../../theme';
import type { RepertoireSummary } from '../../../types';

/** Opened from the chord viewer: adds the current song to an existing or new repertoire. */
export function AddToRepertoireScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { songId } = useLocalSearchParams<{ songId: string }>();
  const { repertoires } = useRepositories();
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, reload } = useAsyncResource(
    useCallback(async () => {
      const [list, containing] = await Promise.all([
        repertoires.list(),
        repertoires.listIdsContainingSong(songId),
      ]);
      return { list, containing: new Set(containing) };
    }, [repertoires, songId]),
  );

  const addTo = async (repertoire: RepertoireSummary) => {
    if (data?.containing.has(repertoire.id)) {
      Alert.alert('Já está no repertório', `Adicionar outra vez em "${repertoire.name}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Adicionar', onPress: () => void add(repertoire.id) },
      ]);
      return;
    }
    await add(repertoire.id);
  };

  const add = async (repertoireId: string) => {
    setBusy(true);
    try {
      await repertoires.addSongs(repertoireId, [songId]);
      router.back();
    } catch (error) {
      logError('addToRepertoire', error);
      Alert.alert('Não foi possível adicionar', toUserMessage(error));
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const createAndAdd = async () => {
    setBusy(true);
    try {
      const repertoire = await repertoires.create({ name: newName, date: null });
      await repertoires.addSongs(repertoire.id, [songId]);
      router.back();
    } catch (error) {
      logError('createAndAdd', error);
      Alert.alert('Não foi possível criar', toUserMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <LoadingView />;

  return (
    <SafeAreaView edges={['bottom']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        contentContainerStyle={styles.content}
        data={data?.list ?? []}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.create}>
            <TextField
              label="Novo repertório"
              value={newName}
              onChangeText={setNewName}
              placeholder="Ex.: Ensaio sexta"
            />
            <Button
              label="Criar e adicionar"
              icon="add"
              onPress={createAndAdd}
              disabled={!newName.trim()}
              loading={busy}
            />
            {(data?.list ?? []).length > 0 ? (
              <AppText variant="label" color="textMuted" style={styles.sectionTitle}>
                Ou escolha um existente
              </AppText>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const contains = data?.containing.has(item.id) ?? false;
          return (
            <Pressable
              onPress={() => addTo(item)}
              disabled={busy}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <View style={styles.flex}>
                <AppText variant="heading">{item.name}</AppText>
                <AppText color="textMuted">
                  {[item.date ? formatShortDate(item.date) : null, `${item.songCount} músicas`]
                    .filter(Boolean)
                    .join('  ·  ')}
                </AppText>
              </View>
              <Icon
                name={contains ? 'checkmark-circle' : 'add-circle-outline'}
                size={28}
                color={contains ? colors.success : colors.accent}
              />
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', paddingBottom: spacing.xxxl },
  create: { padding: spacing.lg, gap: spacing.md },
  sectionTitle: { marginTop: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 68,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
