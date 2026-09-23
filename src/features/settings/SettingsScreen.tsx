import Constants from 'expo-constants';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, MAX_CONTENT_WIDTH, SegmentedControl, Stepper } from '../../components';
import { spacing, useTheme } from '../../theme';
import { DEFAULT_A4, MAX_A4, MIN_A4 } from '../tuner/frequency';
import { DEFAULT_SETTINGS, FONT_SIZE_RANGE, type ThemeMode } from './settings';
import { useSettings } from './SettingsProvider';

export function SettingsScreen() {
  const { colors } = useTheme();
  const { settings, updateSettings } = useSettings();
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Section title="Tema">
        <SegmentedControl<ThemeMode>
          options={[
            { value: 'system', label: 'Sistema' },
            { value: 'dark', label: 'Escuro' },
            { value: 'light', label: 'Claro' },
          ]}
          value={settings.themeMode}
          onChange={(themeMode) => updateSettings({ themeMode })}
        />
      </Section>

      <Section title="Tamanho da letra nas cifras">
        <Stepper
          value={`${settings.sheetFontSize}`}
          onDecrement={() => updateSettings({ sheetFontSize: settings.sheetFontSize - FONT_SIZE_RANGE.step })}
          onIncrement={() => updateSettings({ sheetFontSize: settings.sheetFontSize + FONT_SIZE_RANGE.step })}
          decrementDisabled={settings.sheetFontSize <= FONT_SIZE_RANGE.min}
          incrementDisabled={settings.sheetFontSize >= FONT_SIZE_RANGE.max}
          decrementLabel="Diminuir fonte"
          incrementLabel="Aumentar fonte"
        />
        <AppText style={{ fontSize: settings.sheetFontSize }}>
          <AppText style={{ fontSize: settings.sheetFontSize, color: colors.chord, fontWeight: '700' }}>
            G{' '}
          </AppText>
          Grande é o Senhor
        </AppText>
      </Section>

      <Section title="Afinador — referência A4">
        <Stepper
          value={`${settings.a4Reference} Hz`}
          onDecrement={() => updateSettings({ a4Reference: settings.a4Reference - 1 })}
          onIncrement={() => updateSettings({ a4Reference: settings.a4Reference + 1 })}
          decrementDisabled={settings.a4Reference <= MIN_A4}
          incrementDisabled={settings.a4Reference >= MAX_A4}
          decrementLabel="Diminuir referência"
          incrementLabel="Aumentar referência"
        />
        {settings.a4Reference !== DEFAULT_A4 ? (
          <Button
            label="Voltar para 440 Hz"
            variant="ghost"
            onPress={() => updateSettings({ a4Reference: DEFAULT_A4 })}
          />
        ) : null}
      </Section>

      <Button
        label="Restaurar padrões"
        variant="secondary"
        onPress={() => updateSettings(DEFAULT_SETTINGS)}
      />

      <AppText variant="caption" color="textMuted" align="center">
        ChordSet {version} · funciona 100% offline · seus dados ficam neste aparelho
      </AppText>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label" color="textMuted">
        {title}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.xxl,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingBottom: spacing.xxxl,
  },
  section: { gap: spacing.md, alignItems: 'stretch' },
});
