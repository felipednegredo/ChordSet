import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Screen, ScreenHeader, SegmentedControl, Stepper } from '../../../components';
import { spacing, useTheme } from '../../../theme';
import { useSettings } from '../../settings/SettingsProvider';
import { TunerGauge } from '../components/TunerGauge';
import { StringSelector } from '../components/StringSelector';
import { frequencyToNote, MAX_A4, MIN_A4, tuningStatus } from '../frequency';
import { type GuitarMode, guitarReading } from '../guitar';
import { useTuner } from '../useTuner';

type TunerMode = 'chromatic' | 'guitar';

export function TunerScreen() {
  const { colors } = useTheme();
  const { settings, updateSettings } = useSettings();
  const a4 = settings.a4Reference;
  const tuner = useTuner();
  const [mode, setMode] = useState<TunerMode>('guitar');
  const [guitarMode, setGuitarMode] = useState<GuitarMode>('auto');
  const { stop } = tuner;

  // Release the microphone when leaving the tab.
  useFocusEffect(useCallback(() => () => stop(), [stop]));

  const reading = useMemo(() => {
    if (tuner.frequency === null) return null;
    if (mode === 'chromatic') {
      const note = frequencyToNote(tuner.frequency, a4);
      return note
        ? {
            label: note.name,
            octave: note.octave,
            cents: note.cents,
            target: note.targetFrequency,
            stringId: null,
          }
        : null;
    }
    const guitar = guitarReading(tuner.frequency, guitarMode, a4);
    return guitar
      ? {
          label: guitar.string.name,
          octave: guitar.string.octave,
          cents: guitar.cents,
          target: guitar.targetFrequency,
          stringId: guitar.string.id,
        }
      : null;
  }, [tuner.frequency, mode, guitarMode, a4]);

  const status = reading ? tuningStatus(reading.cents) : null;
  const statusColor =
    status === 'in-tune'
      ? colors.success
      : status === 'flat'
        ? colors.flat
        : status === 'sharp'
          ? colors.sharp
          : colors.textSubtle;
  const statusText =
    status === 'in-tune'
      ? 'Afinado'
      : status === 'flat'
        ? 'Abaixo — aperte a corda'
        : status === 'sharp'
          ? 'Acima — afrouxe a corda'
          : tuner.isListening
            ? 'Toque uma nota…'
            : 'Afinador desligado';

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader eyebrow={`Referência A4 = ${a4} Hz`} title="Afinador" />

        <SegmentedControl<TunerMode>
          options={[
            { value: 'guitar', label: 'Violão' },
            { value: 'chromatic', label: 'Cromático' },
          ]}
          value={mode}
          onChange={setMode}
        />

        <View style={styles.display} accessibilityLiveRegion="polite">
          <View style={styles.noteRow}>
            <AppText style={[styles.note, { color: reading ? statusColor : colors.textSubtle }]}>
              {reading?.label ?? '–'}
            </AppText>
            {reading ? (
              <AppText variant="title" color="textMuted" style={styles.octave}>
                {reading.octave}
              </AppText>
            ) : null}
          </View>
          <AppText variant="heading" style={{ color: statusColor }}>
            {statusText}
          </AppText>
          <View style={styles.metrics}>
            <Metric
              label="Frequência"
              value={tuner.frequency ? `${tuner.frequency.toFixed(1)} Hz` : '— Hz'}
            />
            <Metric
              label="Diferença"
              value={
                reading ? `${reading.cents > 0 ? '+' : ''}${Math.round(reading.cents)} cents` : '— cents'
              }
            />
            <Metric label="Alvo" value={reading ? `${reading.target.toFixed(1)} Hz` : '— Hz'} />
          </View>
        </View>

        <TunerGauge cents={reading?.cents ?? null} status={status} />
        <LevelBar level={tuner.level} active={tuner.isListening} />

        {mode === 'guitar' ? (
          <StringSelector
            mode={guitarMode}
            onModeChange={setGuitarMode}
            activeString={reading?.stringId ?? null}
            inTune={status === 'in-tune'}
          />
        ) : null}

        {tuner.status === 'denied' ? (
          <View style={styles.notice}>
            <AppText color="danger" align="center">
              Permissão do microfone negada. Libere o acesso nas configurações do Android.
            </AppText>
            <Button label="Abrir configurações" variant="secondary" onPress={() => Linking.openSettings()} />
          </View>
        ) : null}
        {tuner.status === 'error' && tuner.error ? (
          <AppText color="danger" align="center">
            {tuner.error}
          </AppText>
        ) : null}

        <Button
          label={tuner.isListening ? 'Parar' : 'Iniciar afinador'}
          icon={tuner.isListening ? 'stop' : 'mic'}
          variant={tuner.isListening ? 'secondary' : 'primary'}
          loading={tuner.status === 'starting'}
          onPress={tuner.isListening ? tuner.stop : tuner.start}
        />

        <View style={styles.reference}>
          <Stepper
            label="Referência A4"
            value={`${a4} Hz`}
            onDecrement={() => updateSettings({ a4Reference: a4 - 1 })}
            onIncrement={() => updateSettings({ a4Reference: a4 + 1 })}
            decrementDisabled={a4 <= MIN_A4}
            incrementDisabled={a4 >= MAX_A4}
            decrementLabel="Diminuir referência"
            incrementLabel="Aumentar referência"
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="label" color="textMuted">
        {label}
      </AppText>
      <AppText variant="bodyStrong" style={styles.tabular}>
        {value}
      </AppText>
    </View>
  );
}

function LevelBar({ level, active }: { level: number; active: boolean }) {
  const { colors } = useTheme();
  // RMS of a guitar note is usually < 0.3; scale so normal playing fills most of the bar.
  const width = active ? Math.min(100, Math.sqrt(level) * 180) : 0;
  return (
    <View
      style={[styles.level, { backgroundColor: colors.surfaceAlt }]}
      accessibilityLabel="Nível do microfone"
    >
      <View style={[styles.levelFill, { width: `${width}%`, backgroundColor: colors.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl },
  display: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  noteRow: { flexDirection: 'row', alignItems: 'flex-end' },
  note: { fontSize: 112, lineHeight: 120, fontWeight: '800', includeFontPadding: false },
  octave: { marginBottom: 18, marginLeft: spacing.xs },
  metrics: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  metric: { alignItems: 'center', gap: spacing.xxs, minWidth: 90 },
  tabular: { fontVariant: ['tabular-nums'] },
  level: { height: 6, borderRadius: 3, overflow: 'hidden' },
  levelFill: { height: '100%' },
  notice: { gap: spacing.md, alignItems: 'center' },
  reference: { alignItems: 'center' },
});
