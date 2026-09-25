import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Icon } from '../../../components';
import { radius, spacing, useTheme } from '../../../theme';
import type { StepJudgement, StepResult } from '../grader';
import { countLabels, type Stroke, type StrumPattern } from '../pattern';

export interface StrumPatternViewProps {
  pattern: StrumPattern;
  /** Pattern position currently being played, or null. */
  activeIndex?: number | null;
  results?: (StepJudgement | null)[];
  size?: 'md' | 'lg';
}

const STROKE_LABEL: Record<Stroke, string> = {
  down: 'para baixo',
  up: 'para cima',
  mute: 'abafado',
  rest: 'pausa',
};

/** Row of strum arrows with the count ("1 e 2 e …") underneath. */
export const StrumPatternView = memo(function StrumPatternView({
  pattern,
  activeIndex = null,
  results,
  size = 'md',
}: StrumPatternViewProps) {
  const { colors } = useTheme();
  const labels = countLabels(pattern.steps.length);
  const iconSize = (size === 'lg' ? 34 : 24) * (pattern.steps.length > 8 ? 0.75 : 1);

  const resultColor = (result: StepResult | undefined): string | null => {
    switch (result) {
      case 'hit':
        return colors.success;
      case 'early':
        return colors.flat;
      case 'late':
        return colors.sharp;
      case 'miss':
      case 'extra':
        return colors.danger;
      default:
        return null;
    }
  };

  const description = pattern.steps.map((step) => STROKE_LABEL[step]).join(', ');

  return (
    <View style={styles.row} accessible accessibilityLabel={`Levada: ${description}`}>
      {pattern.steps.map((stroke, index) => {
        const active = index === activeIndex;
        const feedback = resultColor(results?.[index]?.result);
        const color =
          feedback ?? (active ? colors.onAccent : stroke === 'rest' ? colors.textSubtle : colors.text);
        const onBeat = labels[index] !== 'e' && labels[index] !== '·';
        return (
          <View key={index} style={styles.cell}>
            <View
              style={[
                styles.stroke,
                size === 'lg' && styles.strokeLarge,
                {
                  backgroundColor: active ? colors.accent : colors.surfaceAlt,
                  borderColor: feedback ?? 'transparent',
                },
              ]}
            >
              {stroke === 'down' ? <Icon name="arrow-down" size={iconSize} color={color} /> : null}
              {stroke === 'up' ? <Icon name="arrow-up" size={iconSize} color={color} /> : null}
              {stroke === 'mute' ? <Icon name="close" size={iconSize} color={color} /> : null}
              {stroke === 'rest' ? <View style={[styles.restDot, { backgroundColor: color }]} /> : null}
            </View>
            <AppText
              variant="caption"
              style={{ color: active ? colors.accent : onBeat ? colors.text : colors.textMuted }}
            >
              {labels[index]}
            </AppText>
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs, justifyContent: 'center' },
  cell: { flex: 1, maxWidth: 56, alignItems: 'center', gap: spacing.xxs },
  stroke: {
    alignSelf: 'stretch',
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  strokeLarge: { height: 60 },
  restDot: { width: 6, height: 6, borderRadius: 3 },
});
