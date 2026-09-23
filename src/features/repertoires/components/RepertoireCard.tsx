import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Icon } from '../../../components';
import { formatIsoDate, formatShortDate } from '../../../services/dates';
import { radius, spacing, useTheme } from '../../../theme';
import type { RepertoireSummary } from '../../../types';

export interface RepertoireCardProps {
  repertoire: RepertoireSummary;
  onPress: (repertoire: RepertoireSummary) => void;
}

export const RepertoireCard = memo(function RepertoireCard({ repertoire, onPress }: RepertoireCardProps) {
  const { colors } = useTheme();
  const [, month, day] = repertoire.date?.split('-') ?? [];
  const count = repertoire.songCount;

  return (
    <Pressable
      onPress={() => onPress(repertoire)}
      accessibilityRole="button"
      accessibilityLabel={`${repertoire.name}, ${count} músicas${repertoire.date ? `, ${formatIsoDate(repertoire.date)}` : ''}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.date, { backgroundColor: colors.accentMuted }]}>
        {repertoire.date ? (
          <>
            <AppText variant="title" style={{ color: colors.accent }}>
              {day}
            </AppText>
            <AppText variant="caption" style={{ color: colors.accent }}>
              {formatShortDate(repertoire.date).split(' ').pop() ?? month}
            </AppText>
          </>
        ) : (
          <Icon name="albums-outline" size={28} color={colors.accent} />
        )}
      </View>
      <View style={styles.text}>
        <AppText variant="heading" numberOfLines={2}>
          {repertoire.name}
        </AppText>
        <AppText color="textMuted">
          {count === 0 ? 'Nenhuma música' : count === 1 ? '1 música' : `${count} músicas`}
          {repertoire.date ? `  ·  ${formatShortDate(repertoire.date)}` : ''}
        </AppText>
      </View>
      <Icon name="chevron-forward" size={22} color={colors.textSubtle} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  date: { width: 64, height: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: spacing.xxs },
});
