import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { EmptyState, ErrorState, Fab, LoadingView, Screen, ScreenHeader } from '../../../components';
import { useRepositories } from '../../../database/useRepositories';
import { useAsyncResource } from '../../../hooks/useAsyncResource';
import { toUserMessage } from '../../../services/errors';
import { spacing } from '../../../theme';
import type { RepertoireSummary } from '../../../types';
import { RepertoireCard } from '../components/RepertoireCard';

export function RepertoireListScreen() {
  const router = useRouter();
  const { repertoires } = useRepositories();
  const { data, loading, error, reload } = useAsyncResource(
    useCallback(() => repertoires.list(), [repertoires]),
  );

  const open = useCallback(
    (repertoire: RepertoireSummary) =>
      router.push({ pathname: '/repertoire/[id]', params: { id: repertoire.id } }),
    [router],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <ScreenHeader eyebrow="Setlists" title="Repertórios" />
      </View>
      {loading && !data ? (
        <LoadingView />
      ) : error && !data ? (
        <ErrorState message={toUserMessage(error)} onRetry={reload} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RepertoireCard repertoire={item} onPress={open} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={[styles.list, (data ?? []).length === 0 && styles.emptyList]}
          ListEmptyComponent={
            <EmptyState
              icon="list-outline"
              title="Nenhum repertório"
              message="Monte a lista do culto, ensaio ou show e navegue entre as músicas sem sair da cifra."
              actionLabel="Criar repertório"
              onAction={() => router.push('/repertoire/new')}
            />
          }
        />
      )}
      <Fab icon="add" label="Novo repertório" onPress={() => router.push('/repertoire/new')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  emptyList: { flexGrow: 1 },
  separator: { height: spacing.md },
});
