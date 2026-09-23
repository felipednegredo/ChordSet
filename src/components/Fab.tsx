import { Pressable, StyleSheet } from 'react-native';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { radius, spacing, useTheme } from '../theme';

export interface FabProps {
  icon: IconName;
  label: string;
  onPress: () => void;
}

/** Floating action button with a visible label (clearer than an icon alone). */
export function Fab({ icon, label, onPress }: FabProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.fab, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}
    >
      <Icon name={icon} size={24} color={colors.onAccent} />
      <AppText variant="bodyStrong" style={{ color: colors.onAccent }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 56,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
