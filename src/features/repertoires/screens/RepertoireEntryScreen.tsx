import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Chip,
  EmptyState,
  KeyPicker,
  LoadingView,
  MAX_CONTENT_WIDTH,
  Stepper,
} from '../../../components';
import { useRepositories } from '../../../database/useRepositories';
import { useAsyncResource } from '../../../hooks/useAsyncResource';
import { logError, toUserMessage } from '../../../services/errors';
import { spacing } from '../../../theme';
import type { RepertoireEntry } from '../../../types';
import { clampCapo, MAX_CAPO } from '../../chords';

/**
 * Key and capo for one song inside one repertoire. `null` means "use the
 * library value", so changing the song in the library is still reflected here.
 */
export function RepertoireEntryScreen() {
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const { repertoires } = useRepositories();
  const { data: entry, loading } = useAsyncResource(
    useCallback(() => repertoires.getEntry(entryId), [repertoires, entryId]),
  );

  if (loading && entry === undefined) return <LoadingView />;
  if (!entry) return <EmptyState icon="musical-note-outline" title="Música não encontrada no repertório" />;
  return <EntryEditor key={entry.id} entry={entry} />;
}

function EntryEditor({ entry }: { entry: RepertoireEntry }) {
  const router = useRouter();
  const { repertoires } = useRepositories();
  const [key, setKey] = useState<string | null>(entry.key);
  const [capo, setCapo] = useState<number | null>(entry.capo);
  const [saving, setSaving] = useState(false);

  const effectiveCapo = capo ?? entry.song.capo;

  const save = async () => {
    setSaving(true);
    try {
      await repertoires.updateEntryOverrides(entry.id, { key, capo });
      router.back();
    } catch (error) {
      logError('updateEntryOverrides', error);
      Alert.alert('Não foi possível salvar', toUserMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    Alert.alert('Remover música', `Remover "${entry.song.title}" deste repertório?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await repertoires.removeEntry(entry.id);
            router.back();
          } catch (error) {
            logError('removeEntry', error);
            Alert.alert('Não foi possível remover', toUserMessage(error));
          }
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.group}>
        <AppText variant="title">{entry.song.title}</AppText>
        <AppText color="textMuted">
          Na biblioteca: tom {entry.song.currentKey}
          {entry.song.capo ? `, capo ${entry.song.capo}` : ''} · original {entry.song.originalKey}
        </AppText>
      </View>

      <View style={styles.group}>
        <AppText variant="label" color="textMuted">
          Tom neste repertório
        </AppText>
        <View style={styles.row}>
          <Chip label="Mesmo da biblioteca" selected={key === null} onPress={() => setKey(null)} />
          <Chip
            label="Tom específico"
            selected={key !== null}
            onPress={() => setKey(key ?? entry.song.currentKey)}
          />
        </View>
        {key !== null ? <KeyPicker value={key} onChange={setKey} /> : null}
      </View>

      <View style={styles.group}>
        <AppText variant="label" color="textMuted">
          Capo neste repertório
        </AppText>
        <View style={styles.row}>
          <Chip label="Mesmo da biblioteca" selected={capo === null} onPress={() => setCapo(null)} />
          <Chip label="Capo específico" selected={capo !== null} onPress={() => setCapo(effectiveCapo)} />
        </View>
        {capo !== null ? (
          <Stepper
            value={capo === 0 ? 'Sem capo' : `Casa ${capo}`}
            onDecrement={() => setCapo(clampCapo(capo - 1))}
            onIncrement={() => setCapo(clampCapo(capo + 1))}
            decrementDisabled={capo <= 0}
            incrementDisabled={capo >= MAX_CAPO}
            decrementLabel="Diminuir capo"
            incrementLabel="Aumentar capo"
          />
        ) : null}
      </View>

      <AppText variant="caption" color="textMuted">
        Esses ajustes valem só para este repertório; a cifra na biblioteca não muda.
      </AppText>

      <Button label="Salvar" icon="checkmark" onPress={save} loading={saving} />
      <Button label="Remover do repertório" icon="trash-outline" variant="danger" onPress={remove} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingBottom: spacing.xxxl,
  },
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
