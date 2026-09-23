import { Pressable, StyleSheet } from 'react-native';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { radius, spacing, useTheme } from '../theme';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  size?: 'md' | 'lg';
  accessibilityLabel?: string;
}

export function Chip({ label, selected, onPress, icon, size = 'md', accessibilityLabel }: ChipProps) {
  const { colors } = useTheme();
  const fg = selected ? colors.onAccent : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.chip,
        size === 'lg' && styles.large,
        {
          backgroundColor: selected ? colors.accent : colors.surfaceAlt,
          borderColor: selected ? colors.accent : colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      {icon ? <Icon name={icon} size={16} color={fg} /> : null}
      <AppText variant={size === 'lg' ? 'heading' : 'bodyStrong'} style={{ color: fg }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  large: { minHeight: 52, minWidth: 64, justifyContent: 'center', borderRadius: radius.md },
});
