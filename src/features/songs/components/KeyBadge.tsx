import { StyleSheet, View } from 'react-native';

import { AppText } from '../../../components';
import { radius, spacing, useTheme } from '../../../theme';

export interface KeyBadgeProps {
  musicalKey: string;
  capo?: number | null;
  highlighted?: boolean;
}

export function KeyBadge({ musicalKey, capo, highlighted }: KeyBadgeProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: highlighted ? colors.accentMuted : colors.surfaceAlt, borderColor: colors.border },
      ]}
      accessibilityLabel={`Tom ${musicalKey}${capo ? `, capo ${capo}` : ''}`}
    >
      <AppText variant="heading" style={{ color: highlighted ? colors.accent : colors.chord }}>
        {musicalKey}
      </AppText>
      {capo ? (
        <AppText variant="caption" color="textMuted">
          capo {capo}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
});
