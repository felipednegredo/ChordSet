import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Chip, MAX_CONTENT_WIDTH, TextField } from '../../../components';
import { formatIsoDate, nextSunday, parseBrazilianDate, toIsoDate } from '../../../services/dates';
import { spacing } from '../../../theme';
import type { RepertoireInput } from '../../../types';

export interface RepertoireFormProps {
  initialValue: RepertoireInput;
  submitLabel: string;
  onSubmit: (value: RepertoireInput) => Promise<void>;
  footer?: React.ReactNode;
}

export function RepertoireForm({ initialValue, submitLabel, onSubmit, footer }: RepertoireFormProps) {
  const [name, setName] = useState(initialValue.name);
  const [dateText, setDateText] = useState(formatIsoDate(initialValue.date));
  const [errors, setErrors] = useState<{ name?: string; date?: string }>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const date = dateText.trim() ? parseBrazilianDate(dateText) : null;
    const found = {
      name: name.trim() ? undefined : 'Informe um nome.',
      date: dateText.trim() && !date ? 'Use o formato DD/MM/AAAA.' : undefined,
    };
    setErrors(found);
    if (found.name || found.date) return;
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), date });
    } finally {
      setSaving(false);
    }
  };

  const today = new Date();
  const sunday = nextSunday(today);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TextField
        label="Nome"
        value={name}
        onChangeText={setName}
        error={errors.name}
        placeholder="Ex.: Culto Domingo"
        autoFocus={!initialValue.name}
      />
      <View style={styles.group}>
        <TextField
          label="Data (opcional)"
          value={dateText}
          onChangeText={setDateText}
          error={errors.date}
          placeholder="DD/MM/AAAA"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
        <View style={styles.row}>
          <Chip label="Hoje" onPress={() => setDateText(formatIsoDate(toIsoDate(today)))} />
          <Chip label="Próximo domingo" onPress={() => setDateText(formatIsoDate(toIsoDate(sunday)))} />
          {dateText ? <Chip label="Sem data" icon="close" onPress={() => setDateText('')} /> : null}
        </View>
        <AppText variant="caption" color="textMuted">
          A data ajuda a ordenar a lista de repertórios.
        </AppText>
      </View>
      <Button label={submitLabel} icon="checkmark" onPress={submit} loading={saving} />
      {footer}
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
  },
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
