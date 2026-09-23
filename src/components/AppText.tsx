import { StyleSheet, Text, type TextProps } from 'react-native';

import { type ColorPalette, typography, type TypographyVariant, useTheme } from '../theme';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: keyof ColorPalette;
  align?: 'left' | 'center' | 'right';
}

export function AppText({ variant = 'body', color = 'text', align, style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        typography[variant],
        { color: colors[color] },
        align && { textAlign: align },
        styles.base,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false },
});
