import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Chip } from '../../../components';
import { radius, spacing, useTheme } from '../../../theme';
import type { StringMode } from '../instruments';
import type { InstrumentString } from '../notes';

export interface StringSelectorProps {
  strings: readonly InstrumentString[];
  mode: StringMode;
  onModeChange: (mode: StringMode) => void;
  /** String currently detected (highlighted in auto mode). */
  activeString: string | null;
  inTune: boolean;
}

export function StringSelector({ strings, mode, onModeChange, activeString, inTune }: StringSelectorProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Chip
          label="Automático"
          icon="sparkles-outline"
          selected={mode === 'auto'}
          onPress={() => onModeChange('auto')}
        />
        <AppText variant="caption" color="textMuted">
          {mode === 'auto' ? 'Detecta a corda tocada' : 'Toque na corda de novo para voltar ao automático'}
        </AppText>
      </View>
      <View style={styles.strings}>
        {strings.map((string) => {
          const selected = mode === string.id;
          const active = activeString === string.id;
          const borderColor = active
            ? inTune
              ? colors.success
              : colors.accent
            : selected
              ? colors.accent
              : colors.border;
          return (
            <Pressable
              key={string.id}
              onPress={() => onModeChange(selected ? 'auto' : string.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Corda ${string.number}, ${string.name}${string.octave}`}
              style={({ pressed }) => [
                styles.string,
                {
                  borderColor,
                  borderWidth: active || selected ? 2 : 1,
                  backgroundColor: selected ? colors.accentMuted : colors.surface,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <AppText variant="title" style={{ color: active && inTune ? colors.success : colors.text }}>
                {string.name}
              </AppText>
              <AppText variant="caption" color="textMuted">
                {string.name}
                {string.octave} · {string.number}ª
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md, width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  strings: { flexDirection: 'row', gap: spacing.sm },
  string: {
    flex: 1,
    minHeight: 72,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
});
