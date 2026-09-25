import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Chip, KeyPicker, MAX_CONTENT_WIDTH, Stepper, TextField } from '../../../components';
import { spacing } from '../../../theme';
import type { SongInput } from '../../../types';
import { clampCapo, extractMetadata, isValidKey, MAX_CAPO, normalizeToChordPro } from '../../chords';
import { StrumPatternView } from '../../rhythm/components/StrumPatternView';
import {
  clampTempo,
  DEFAULT_TEMPO,
  normalizePatternText,
  parsePattern,
  PATTERN_PRESETS,
  TEMPO_RANGE,
} from '../../rhythm/pattern';
import { getSongFormErrors, type SongFormErrors } from '../songValidation';

export interface SongFormProps {
  initialValue: SongInput;
  submitLabel: string;
  onSubmit: (value: SongInput) => Promise<void>;
  footer?: React.ReactNode;
}

const CONTENT_PLACEHOLDER = `{title: Nome da música}
{key: G}

[G]Grande é o Senhor
[C]Digno de louvor

— ou cole acordes em cima da letra —`;

export function SongForm({ initialValue, submitLabel, onSubmit, footer }: SongFormProps) {
  const [value, setValue] = useState<SongInput>(initialValue);
  const [errors, setErrors] = useState<SongFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [sameKey, setSameKey] = useState(initialValue.currentKey === initialValue.originalKey);

  const patch = (changes: Partial<SongInput>) => setValue((previous) => ({ ...previous, ...changes }));

  const setOriginalKey = (key: string) =>
    patch(sameKey ? { originalKey: key, currentKey: key } : { originalKey: key });

  const rhythmText = value.rhythm ?? '';
  const pattern = useMemo(() => parsePattern(rhythmText), [rhythmText]);
  const tempo = value.tempo ?? null;

  /**
   * Fills empty fields from ChordPro directives ({title}, {artist}, {key}, {capo},
   * {tempo}, {rhythm}/{ritmo}/{levada}) when content is pasted.
   */
  const setContent = (content: string) => {
    const metadata = extractMetadata(content);
    setValue((previous) => {
      const next = { ...previous, content };
      if (!previous.title.trim() && metadata.title) next.title = metadata.title;
      if (!previous.artist.trim() && metadata.artist) next.artist = metadata.artist;
      if (metadata.key && isValidKey(metadata.key) && previous.content.trim() === '') {
        next.originalKey = metadata.key;
        if (sameKey) next.currentKey = metadata.key;
      }
      if (metadata.capo !== undefined && previous.content.trim() === '') next.capo = clampCapo(metadata.capo);
      const rhythm = metadata.extra.rhythm ?? metadata.extra.ritmo ?? metadata.extra.levada;
      if (!previous.rhythm?.trim() && rhythm && parsePattern(rhythm))
        next.rhythm = normalizePatternText(rhythm);
      if (previous.tempo == null && metadata.tempo !== undefined) next.tempo = clampTempo(metadata.tempo);
      return next;
    });
  };

  const submit = async () => {
    const found = getSongFormErrors(value);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      await onSubmit(value);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField
          label="Título"
          value={value.title}
          onChangeText={(title) => patch({ title })}
          error={errors.title}
          placeholder="Ex.: Grande é o Senhor"
          returnKeyType="next"
        />
        <TextField
          label="Artista"
          value={value.artist}
          onChangeText={(artist) => patch({ artist })}
          error={errors.artist}
          placeholder="Opcional"
        />

        <View style={styles.group}>
          <AppText variant="label" color="textMuted">
            Tom original (em que a cifra está escrita)
          </AppText>
          <KeyPicker value={value.originalKey} onChange={setOriginalKey} />
          {errors.originalKey ? (
            <AppText variant="caption" color="danger">
              {errors.originalKey}
            </AppText>
          ) : null}
        </View>

        <View style={styles.group}>
          <AppText variant="label" color="textMuted">
            Tom atual
          </AppText>
          <View style={styles.row}>
            <Chip
              label="Igual ao original"
              selected={sameKey}
              onPress={() => {
                setSameKey(true);
                patch({ currentKey: value.originalKey });
              }}
            />
            <Chip label="Outro tom" selected={!sameKey} onPress={() => setSameKey(false)} />
          </View>
          {!sameKey ? (
            <KeyPicker value={value.currentKey} onChange={(currentKey) => patch({ currentKey })} />
          ) : null}
        </View>

        <View style={styles.group}>
          <AppText variant="label" color="textMuted">
            Capotraste
          </AppText>
          <Stepper
            value={value.capo === 0 ? 'Sem capo' : `Casa ${value.capo}`}
            onDecrement={() => patch({ capo: clampCapo(value.capo - 1) })}
            onIncrement={() => patch({ capo: clampCapo(value.capo + 1) })}
            decrementDisabled={value.capo <= 0}
            incrementDisabled={value.capo >= MAX_CAPO}
            decrementLabel="Diminuir capo"
            incrementLabel="Aumentar capo"
          />
        </View>

        <View style={styles.group}>
          <TextField
            label="Levada (ritmo)"
            value={rhythmText}
            onChangeText={(rhythm) => patch({ rhythm })}
            onBlur={() => patch({ rhythm: normalizePatternText(rhythmText) })}
            error={errors.rhythm}
            monospace
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="Ex.: D- DU -U DU"
            hint="D = baixo, U = cima, X = abafado, - = pausa. Cada letra é meio tempo; some x2 no fim para repetir."
          />
          <View style={styles.row}>
            {PATTERN_PRESETS.map((preset) => (
              <Chip
                key={preset.name}
                label={preset.name}
                selected={pattern !== null && normalizePatternText(rhythmText) === preset.pattern}
                onPress={() => patch({ rhythm: preset.pattern, tempo: tempo ?? preset.tempo })}
              />
            ))}
          </View>
          {pattern ? <StrumPatternView pattern={pattern} /> : null}
          {pattern ? (
            <Stepper
              label="Andamento"
              value={tempo === null ? `${DEFAULT_TEMPO} BPM` : `${tempo} BPM`}
              onDecrement={() => patch({ tempo: clampTempo((tempo ?? DEFAULT_TEMPO) - 2) })}
              onIncrement={() => patch({ tempo: clampTempo((tempo ?? DEFAULT_TEMPO) + 2) })}
              decrementDisabled={(tempo ?? DEFAULT_TEMPO) <= TEMPO_RANGE.min}
              incrementDisabled={(tempo ?? DEFAULT_TEMPO) >= TEMPO_RANGE.max}
              decrementLabel="Diminuir andamento"
              incrementLabel="Aumentar andamento"
            />
          ) : null}
        </View>

        <TextField
          label="Cifra"
          value={value.content}
          onChangeText={setContent}
          error={errors.content}
          multiline
          monospace
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={CONTENT_PLACEHOLDER}
          hint="Use [Acorde] antes da sílaba, diretivas {title: …} {c: …} {soc}/{eoc}, ou cole acordes em cima da letra."
        />
        <Button
          label="Converter para ChordPro"
          icon="color-wand-outline"
          variant="secondary"
          onPress={() => patch({ content: normalizeToChordPro(value.content) })}
          disabled={!value.content.trim()}
        />

        <Button label={submitLabel} icon="checkmark" onPress={submit} loading={saving} />
        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxxl * 2,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
