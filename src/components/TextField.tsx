import { forwardRef } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { AppText } from './AppText';
import { fonts, radius, spacing, useTheme } from '../theme';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  monospace?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, monospace, style, multiline, ...rest },
  ref,
) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrapper}>
      <AppText variant="label" color="textMuted">
        {label}
      </AppText>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textSubtle}
        multiline={multiline}
        accessibilityLabel={label}
        style={[
          styles.input,
          multiline && styles.multiline,
          monospace && { fontFamily: fonts.mono },
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color="textMuted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 17,
  },
  multiline: { minHeight: 260, textAlignVertical: 'top', fontSize: 15, lineHeight: 22 },
});
