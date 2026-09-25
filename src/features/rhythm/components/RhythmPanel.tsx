import { useMemo } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Chip, IconButton, Stepper } from '../../../components';
import { spacing, useTheme } from '../../../theme';
import type { StepJudgement } from '../grader';
import {
  beatsInPattern,
  clampTempo,
  countStrokes,
  DEFAULT_TEMPO,
  formatPattern,
  parsePattern,
  PATTERN_PRESETS,
  TEMPO_RANGE,
} from '../pattern';
import { useRhythmPractice } from '../useRhythmPractice';
import { StrumPatternView } from './StrumPatternView';

export interface RhythmPanelProps {
  rhythm: string;
  tempo: number | null;
  onChange: (rhythm: string, tempo: number | null) => void;
}

const TEMPO_STEP = 2;

function judgementText(judgement: StepJudgement): string {
  const ms = judgement.offsetMs === null ? 0 : Math.round(Math.abs(judgement.offsetMs));
  switch (judgement.result) {
    case 'hit':
      return 'No tempo!';
    case 'early':
      return `Adiantado ${ms} ms`;
    case 'late':
      return `Atrasado ${ms} ms`;
    case 'miss':
      return 'Faltou uma batida';
    case 'extra':
      return 'Tocou na pausa';
    default:
      return '';
  }
}

/** Strumming guide for the chord viewer: arrows, count, tempo and microphone practice. */
export function RhythmPanel({ rhythm, tempo, onChange }: RhythmPanelProps) {
  const { colors } = useTheme();
  const pattern = useMemo(() => parsePattern(rhythm), [rhythm]);
  const bpm = clampTempo(tempo ?? DEFAULT_TEMPO);
  const practice = useRhythmPractice(pattern, bpm);
  const selectedPreset = pattern ? formatPattern(pattern) : null;

  const presets = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets}>
      {PATTERN_PRESETS.map((preset) => (
        <Chip
          key={preset.name}
          label={preset.name}
          selected={selectedPreset === preset.pattern}
          onPress={() => onChange(preset.pattern, tempo ?? preset.tempo)}
          accessibilityLabel={`Levada ${preset.name}: ${preset.pattern}`}
        />
      ))}
    </ScrollView>
  );

  if (!pattern) {
    return (
      <View style={styles.container}>
        <AppText color="textMuted" align="center">
          Esta cifra ainda não tem levada. Escolha uma para ver as setas:
        </AppText>
        {presets}
      </View>
    );
  }

  const { steps, repeats } = pattern;
  const running = practice.status === 'running' && practice.step >= 0;
  const activeIndex = running ? practice.step % steps.length : null;
  const round = running ? (Math.floor(practice.step / steps.length) % repeats) + 1 : 1;
  const listening = practice.mode === 'mic' && practice.isRunning;

  const summary = [
    `${countStrokes(pattern)} batidas em ${beatsInPattern(pattern)} tempos`,
    repeats > 1 ? (running ? `vez ${round} de ${repeats}` : `repetir ${repeats}x`) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const { stats, lastJudgement } = practice;
  const drift =
    stats?.meanOffsetMs == null
      ? null
      : stats.meanOffsetMs < -40
        ? 'Você está correndo'
        : stats.meanOffsetMs > 40
          ? 'Você está atrasando'
          : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="caption" color="textMuted">
          {summary}
        </AppText>
        {practice.countIn > 0 ? (
          <AppText variant="bodyStrong" color="accent" accessibilityLiveRegion="polite">
            Prepare-se… {practice.countIn}
          </AppText>
        ) : null}
      </View>

      <StrumPatternView
        pattern={pattern}
        activeIndex={activeIndex}
        results={practice.mode === 'mic' ? practice.results : undefined}
        size="lg"
      />

      <View style={styles.controls}>
        <IconButton
          icon={practice.isRunning && practice.mode === 'guide' ? 'stop' : 'play'}
          variant={practice.isRunning && practice.mode === 'guide' ? 'filled' : 'accent'}
          onPress={() =>
            practice.isRunning && practice.mode === 'guide' ? practice.stop() : practice.start('guide')
          }
          accessibilityLabel={
            practice.isRunning && practice.mode === 'guide' ? 'Parar guia' : 'Tocar guia de ritmo'
          }
        />
        <Stepper
          label="BPM"
          value={`${bpm}`}
          onDecrement={() => onChange(rhythm, clampTempo(bpm - TEMPO_STEP))}
          onIncrement={() => onChange(rhythm, clampTempo(bpm + TEMPO_STEP))}
          decrementDisabled={bpm <= TEMPO_RANGE.min}
          incrementDisabled={bpm >= TEMPO_RANGE.max}
          decrementLabel="Diminuir andamento"
          incrementLabel="Aumentar andamento"
        />
        <IconButton
          icon={listening ? 'mic-off' : 'mic'}
          variant={listening ? 'accent' : 'filled'}
          onPress={() => (listening ? practice.stop() : practice.start('mic'))}
          accessibilityLabel={listening ? 'Parar prática com microfone' : 'Praticar com o microfone'}
        />
      </View>

      {practice.mode === 'mic' && practice.status === 'running' ? (
        <View style={styles.feedback} accessibilityLiveRegion="polite">
          <AppText variant="heading" color={lastJudgement?.result === 'hit' ? 'success' : 'text'}>
            {lastJudgement ? judgementText(lastJudgement) : 'Toque junto com as setas'}
          </AppText>
          {stats && stats.accuracy !== null ? (
            <AppText variant="caption" color="textMuted">
              Precisão {Math.round(stats.accuracy * 100)}% · {stats.hits}/{stats.strokes} no tempo
              {stats.misses > 0 ? ` · ${stats.misses} faltando` : ''}
              {stats.extras > 0 ? ` · ${stats.extras} na pausa` : ''}
              {drift ? ` · ${drift}` : ''}
            </AppText>
          ) : null}
          <AppText variant="caption" color="textSubtle" align="center">
            O microfone confere o tempo de cada batida; a direção da seta fica por sua conta.
          </AppText>
        </View>
      ) : null}

      {practice.status === 'denied' ? (
        <View style={styles.feedback}>
          <AppText color="danger" align="center">
            Permissão do microfone negada. Libere o acesso nas configurações do Android.
          </AppText>
          <Button label="Abrir configurações" variant="secondary" onPress={() => Linking.openSettings()} />
        </View>
      ) : null}
      {practice.status === 'error' && practice.error ? (
        <AppText color="danger" align="center">
          {practice.error}
        </AppText>
      ) : null}

      {!practice.isRunning ? presets : null}
      <View style={[styles.legend, { borderTopColor: colors.border }]}>
        <AppText variant="caption" color="textSubtle">
          ↓ baixo · ↑ cima · ✕ abafado · • pausa
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 22 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  feedback: { alignItems: 'center', gap: spacing.xs },
  presets: { gap: spacing.sm, paddingVertical: spacing.xxs },
  legend: { alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm },
});
