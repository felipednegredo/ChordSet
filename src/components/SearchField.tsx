import { StyleSheet, TextInput, View } from 'react-native';

import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { radius, spacing, useTheme } from '../theme';

export interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchField({ value, onChangeText, placeholder = 'Buscar' }: SearchFieldProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Icon name="search" size={20} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        style={[styles.input, { color: colors.text }]}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel={placeholder}
      />
      {value ? (
        <IconButton
          icon="close-circle"
          size={20}
          onPress={() => onChangeText('')}
          accessibilityLabel="Limpar busca"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingLeft: spacing.lg,
    minHeight: 52,
    gap: spacing.sm,
  },
  input: { flex: 1, fontSize: 17, paddingVertical: spacing.md },
});
