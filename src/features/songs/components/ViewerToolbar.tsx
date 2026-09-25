import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Icon, type IconName, IconButton, Stepper } from '../../../components';
import { radius, spacing, TOUCH_TARGET, useTheme } from '../../../theme';
import { MAX_CAPO } from '../../chords';
import { FONT_SIZE_RANGE, SCROLL_SPEED_RANGE } from '../../settings/settings';

export type ToolbarPanel = 'key' | 'capo' | 'font' | 'scroll' | 'rhythm' | null;

export interface ViewerToolbarProps {
  panel: ToolbarPanel;
  onPanelChange: (panel: ToolbarPanel) => void;
  soundingKey: string;
  shapesKey: string;
  canResetKey: boolean;
  resetKeyLabel: string;
  onTranspose: (delta: number) => void;
  onResetKey: () => void;
  capo: number;
  onCapoChange: (capo: number) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  showChords: boolean;
  onToggleChords: () => void;
  isScrolling: boolean;
  onToggleScroll: () => void;
  scrollSpeed: number;
  onScrollSpeedChange: (speed: number) => void;
  hasRhythm: boolean;
  /** Content of the strumming panel, rendered only while it is open. */
  rhythmPanel: React.ReactNode;
}

interface ToolProps {
  icon: IconName;
  label: string;
  value?: string;
  active?: boolean;
  onPress: () => void;
}

function Tool({ icon, label, value, active, onPress }: ToolProps) {
  const { colors } = useTheme();
  const color = active ? colors.accent : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={value ? `${label}: ${value}` : label}
      style={({ pressed }) => [
        styles.tool,
        { backgroundColor: active ? colors.accentMuted : 'transparent', opacity: pressed ? 0.6 : 1 },
      ]}
    >
      {value ? (
        <AppText variant="heading" style={{ color }} numberOfLines={1}>
          {value}
        </AppText>
      ) : (
        <Icon name={icon} size={24} color={color} />
      )}
      <AppText
        variant="caption"
        style={{ color: active ? colors.accent : colors.textMuted }}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

/** Bottom control bar: one row of tools, one expandable panel above it. */
export function ViewerToolbar(props: ViewerToolbarProps) {
  const { colors } = useTheme();
  const { panel, onPanelChange } = props;
  const togglePanel = (next: Exclude<ToolbarPanel, null>) => onPanelChange(panel === next ? null : next);

  const renderPanel = () => {
    switch (panel) {
      case 'key':
        return (
          <View style={styles.panelRow}>
            <Stepper
              label={props.capo > 0 ? `Soa em · formas ${props.shapesKey}` : 'Tom'}
              value={props.soundingKey}
              onDecrement={() => props.onTranspose(-1)}
              onIncrement={() => props.onTranspose(1)}
              decrementLabel="Diminuir meio tom"
              incrementLabel="Aumentar meio tom"
            />
            <Button
              label={props.resetKeyLabel}
              variant="ghost"
              onPress={props.onResetKey}
              disabled={!props.canResetKey}
            />
          </View>
        );
      case 'capo':
        return (
          <View style={styles.panelRow}>
            <Stepper
              label="Capotraste"
              value={props.capo === 0 ? 'Sem' : `${props.capo}ª`}
              onDecrement={() => props.onCapoChange(props.capo - 1)}
              onIncrement={() => props.onCapoChange(props.capo + 1)}
              decrementDisabled={props.capo <= 0}
              incrementDisabled={props.capo >= MAX_CAPO}
              decrementLabel="Diminuir capo"
              incrementLabel="Aumentar capo"
            />
            <AppText variant="caption" color="textMuted" style={styles.hint}>
              Formas em {props.shapesKey}
            </AppText>
          </View>
        );
      case 'font':
        return (
          <View style={styles.panelRow}>
            <Stepper
              label="Fonte"
              value={`${props.fontSize}`}
              onDecrement={() => props.onFontSizeChange(props.fontSize - FONT_SIZE_RANGE.step)}
              onIncrement={() => props.onFontSizeChange(props.fontSize + FONT_SIZE_RANGE.step)}
              decrementDisabled={props.fontSize <= FONT_SIZE_RANGE.min}
              incrementDisabled={props.fontSize >= FONT_SIZE_RANGE.max}
              decrementLabel="Diminuir fonte"
              incrementLabel="Aumentar fonte"
            />
          </View>
        );
      case 'scroll':
        return (
          <View style={styles.panelRow}>
            <IconButton
              icon={props.isScrolling ? 'pause' : 'play'}
              variant="accent"
              size={28}
              onPress={props.onToggleScroll}
              accessibilityLabel={props.isScrolling ? 'Pausar rolagem' : 'Iniciar rolagem'}
            />
            <Stepper
              label="Velocidade"
              value={`${props.scrollSpeed}`}
              onDecrement={() => props.onScrollSpeedChange(props.scrollSpeed - 1)}
              onIncrement={() => props.onScrollSpeedChange(props.scrollSpeed + 1)}
              decrementDisabled={props.scrollSpeed <= SCROLL_SPEED_RANGE.min}
              incrementDisabled={props.scrollSpeed >= SCROLL_SPEED_RANGE.max}
              decrementLabel="Rolar mais devagar"
              incrementLabel="Rolar mais rápido"
            />
          </View>
        );
      case 'rhythm':
        return props.rhythmPanel;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {panel ? (
        <View style={[styles.panel, { borderBottomColor: colors.border }]}>{renderPanel()}</View>
      ) : null}
      <View style={styles.tools}>
        <Tool
          icon="swap-vertical"
          label="Tom"
          value={props.soundingKey}
          active={panel === 'key'}
          onPress={() => togglePanel('key')}
        />
        <Tool
          icon="git-commit-outline"
          label="Capo"
          value={props.capo === 0 ? '–' : `${props.capo}`}
          active={panel === 'capo'}
          onPress={() => togglePanel('capo')}
        />
        <Tool icon="text" label="Fonte" active={panel === 'font'} onPress={() => togglePanel('font')} />
        <Tool
          icon={props.hasRhythm ? 'pulse' : 'pulse-outline'}
          label="Ritmo"
          active={panel === 'rhythm'}
          onPress={() => togglePanel('rhythm')}
        />
        <Tool
          icon={props.showChords ? 'eye-outline' : 'eye-off-outline'}
          label={props.showChords ? 'Acordes' : 'Só letra'}
          active={!props.showChords}
          onPress={props.onToggleChords}
        />
        <Tool
          icon={props.isScrolling ? 'pause-circle' : 'play-circle-outline'}
          label="Rolagem"
          active={panel === 'scroll' || props.isScrolling}
          onPress={() => togglePanel('scroll')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderTopWidth: 1, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  panel: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  panelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  hint: { maxWidth: 140 },
  tools: { flexDirection: 'row', paddingHorizontal: spacing.xs, paddingVertical: spacing.xs },
  tool: {
    flex: 1,
    minHeight: TOUCH_TARGET + 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    gap: 2,
  },
});
