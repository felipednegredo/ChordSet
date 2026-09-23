import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { spacing } from '../theme';

export interface StepperProps {
  label?: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
  decrementLabel: string;
  incrementLabel: string;
}

/** Large "−  value  +" control used for key, capo, font size and speed. */
export function Stepper({
  label,
  value,
  onDecrement,
  onIncrement,
  decrementDisabled,
  incrementDisabled,
  decrementLabel,
  incrementLabel,
}: StepperProps) {
  return (
    <View style={styles.row}>
      <IconButton
        icon="remove"
        variant="filled"
        onPress={onDecrement}
        disabled={decrementDisabled}
        accessibilityLabel={decrementLabel}
      />
      <View style={styles.value}>
        {label ? (
          <AppText variant="label" color="textMuted" align="center">
            {label}
          </AppText>
        ) : null}
        <AppText variant="title" align="center" accessibilityLiveRegion="polite">
          {value}
        </AppText>
      </View>
      <IconButton
        icon="add"
        variant="filled"
        onPress={onIncrement}
        disabled={incrementDisabled}
        accessibilityLabel={incrementLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  value: { minWidth: 84, alignItems: 'center' },
});
