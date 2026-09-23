import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, IconButton } from '../../../components';
import { spacing, useTheme } from '../../../theme';
import type { RepertoireEntry } from '../../../types';
import { KeyBadge } from '../../songs/components/KeyBadge';

export interface EntryRowProps {
  entry: RepertoireEntry;
  index: number;
  total: number;
  editing: boolean;
  onOpen: (entry: RepertoireEntry) => void;
  onOptions: (entry: RepertoireEntry) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (entry: RepertoireEntry) => void;
}

export const EntryRow = memo(function EntryRow({
  entry,
  index,
  total,
  editing,
  onOpen,
  onOptions,
  onMove,
  onRemove,
}: EntryRowProps) {
  const { colors } = useTheme();
  const key = entry.key ?? entry.song.currentKey;
  const capo = entry.capo ?? entry.song.capo;
  const overridden = entry.key !== null || entry.capo !== null;

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Pressable
        onPress={() => (editing ? onOptions(entry) : onOpen(entry))}
        accessibilityRole="button"
        accessibilityLabel={`${index + 1}. ${entry.song.title}, tom ${key}`}
        accessibilityHint={editing ? 'Ajustar tom e capo' : 'Abrir cifra'}
        style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : 1 }]}
      >
        <AppText variant="title" color="textSubtle" style={styles.number}>
          {index + 1}
        </AppText>
        <View style={styles.text}>
          <AppText variant="heading" numberOfLines={1}>
            {entry.song.title}
          </AppText>
          <AppText color="textMuted" numberOfLines={1}>
            {entry.song.artist || '—'}
            {overridden ? '  ·  ajustado p/ este repertório' : ''}
          </AppText>
        </View>
      </Pressable>
      {editing ? (
        <View style={styles.actions}>
          <IconButton
            icon="arrow-up"
            variant="filled"
            disabled={index === 0}
            onPress={() => onMove(index, -1)}
            accessibilityLabel="Mover para cima"
          />
          <IconButton
            icon="arrow-down"
            variant="filled"
            disabled={index === total - 1}
            onPress={() => onMove(index, 1)}
            accessibilityLabel="Mover para baixo"
          />
          <IconButton
            icon="trash-outline"
            color={colors.danger}
            onPress={() => onRemove(entry)}
            accessibilityLabel="Remover do repertório"
          />
        </View>
      ) : (
        <Pressable
          onPress={() => onOptions(entry)}
          accessibilityRole="button"
          accessibilityLabel={`Ajustar tom e capo, tom ${key}`}
          hitSlop={8}
        >
          <KeyBadge musicalKey={key} capo={capo} highlighted={overridden} />
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg,
    minHeight: 76,
  },
  number: { width: 36, textAlign: 'center' },
  text: { flex: 1, gap: spacing.xxs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
