import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppText,
  Button,
  EmptyState,
  Icon,
  LoadingView,
  MAX_CONTENT_WIDTH,
  SearchField,
} from '../../../components';
import { useRepositories } from '../../../database/useRepositories';
import { useAsyncResource } from '../../../hooks/useAsyncResource';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { logError, toUserMessage } from '../../../services/errors';
import { spacing, useTheme } from '../../../theme';

/** Multi-select picker that appends songs to the end of a repertoire, in the order they were tapped. */
export function AddSongsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { repertoireId } = useLocalSearchParams<{ repertoireId: string }>();
  const { songs, repertoires } = useRepositories();
  const [text, setText] = useState('');
  const query = useDebouncedValue(text, 150);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data, loading } = useAsyncResource(
    useCallback(async () => {
      const [list, entries] = await Promise.all([
        songs.list({ text: query }),
        repertoires.listEntries(repertoireId),
      ]);
      return { list, inRepertoire: new Set(entries.map((e) => e.songId)) };
    }, [songs, repertoires, query, repertoireId]),
  );

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (songId: string) =>
    setSelected((current) =>
      current.includes(songId) ? current.filter((id) => id !== songId) : [...current, songId],
    );

  const save = async () => {
    setSaving(true);
    try {
      await repertoires.addSongs(repertoireId, selected);
      router.back();
    } catch (error) {
      logError('addSongs', error);
      Alert.alert('Não foi possível adicionar', toUserMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.inner}>
        <View style={styles.search}>
          <SearchField value={text} onChangeText={setText} placeholder="Buscar na biblioteca" />
        </View>
        {loading && !data ? (
          <LoadingView />
        ) : (
          <FlatList
            data={data?.list ?? []}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={(data?.list ?? []).length === 0 && styles.flexGrow}
            ListEmptyComponent={<EmptyState icon="search" title="Nenhuma cifra encontrada" />}
            renderItem={({ item }) => {
              const order = selected.indexOf(item.id);
              const isSelected = selectedSet.has(item.id);
              return (
                <Pressable
                  onPress={() => toggle(item.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  style={[styles.row, { borderBottomColor: colors.border }]}
                >
                  <View
                    style={[
                      styles.check,
                      {
                        borderColor: isSelected ? colors.accent : colors.border,
                        backgroundColor: isSelected ? colors.accent : 'transparent',
                      },
                    ]}
                  >
                    {isSelected ? (
                      <AppText variant="bodyStrong" style={{ color: colors.onAccent }}>
                        {order + 1}
                      </AppText>
                    ) : null}
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="heading" numberOfLines={1}>
                      {item.title}
                    </AppText>
                    <AppText color="textMuted" numberOfLines={1}>
                      {item.artist || '—'}
                    </AppText>
                  </View>
                  {data?.inRepertoire.has(item.id) ? (
                    <View style={styles.tag}>
                      <Icon name="checkmark-done" size={16} color={colors.textMuted} />
                      <AppText variant="caption" color="textMuted">
                        já está
                      </AppText>
                    </View>
                  ) : null}
                </Pressable>
              );
            }}
          />
        )}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button
            label={selected.length === 0 ? 'Selecione músicas' : `Adicionar ${selected.length}`}
            icon="add"
            onPress={save}
            disabled={selected.length === 0}
            loading={saving}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexGrow: { flexGrow: 1 },
  inner: { flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  search: { padding: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 68,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  check: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  footer: { padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth },
});
