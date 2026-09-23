import { StyleSheet, View } from 'react-native';

import { AppText } from '../../../components';
import { radius, spacing, useTheme } from '../../../theme';
import { IN_TUNE_CENTS, type TuningStatus } from '../frequency';

export interface TunerGaugeProps {
  cents: number | null;
  status: TuningStatus | null;
}

const RANGE = 50;
const TICKS = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];

/** Horizontal meter from -50 to +50 cents with an in-tune zone in the middle. */
export function TunerGauge({ cents, status }: TunerGaugeProps) {
  const { colors } = useTheme();
  const clamped = cents === null ? 0 : Math.max(-RANGE, Math.min(RANGE, cents));
  const position = ((clamped + RANGE) / (RANGE * 2)) * 100;
  const color =
    status === 'in-tune'
      ? colors.success
      : status === 'flat'
        ? colors.flat
        : status === 'sharp'
          ? colors.sharp
          : colors.textSubtle;
  const zoneWidth = ((IN_TUNE_CENTS * 2) / (RANGE * 2)) * 100;

  return (
    <View
      style={styles.wrapper}
      accessibilityLabel={cents === null ? 'Sem sinal' : `${Math.round(cents)} cents`}
    >
      <View style={[styles.track, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <View
          style={[
            styles.zone,
            {
              left: `${50 - zoneWidth / 2}%`,
              width: `${zoneWidth}%`,
              backgroundColor: colors.success,
              opacity: 0.25,
            },
          ]}
        />
        {TICKS.map((tick) => (
          <View
            key={tick}
            style={[
              styles.tick,
              {
                left: `${((tick + RANGE) / (RANGE * 2)) * 100}%`,
                height: tick === 0 ? '70%' : tick % 20 === 0 ? '40%' : '25%',
                backgroundColor: tick === 0 ? colors.text : colors.textSubtle,
              },
            ]}
          />
        ))}
        {cents !== null ? (
          <View style={[styles.needle, { left: `${position}%`, backgroundColor: color }]} />
        ) : null}
      </View>
      <View style={styles.labels}>
        <AppText variant="caption" style={{ color: colors.flat }}>
          ♭ abaixo
        </AppText>
        <AppText variant="caption" style={{ color: colors.success }}>
          afinado
        </AppText>
        <AppText variant="caption" style={{ color: colors.sharp }}>
          acima ♯
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', gap: spacing.sm },
  track: {
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  zone: { position: 'absolute', top: 0, bottom: 0 },
  tick: { position: 'absolute', width: 2, marginLeft: -1, borderRadius: 1 },
  needle: { position: 'absolute', top: 6, bottom: 6, width: 8, marginLeft: -4, borderRadius: 4 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
});
