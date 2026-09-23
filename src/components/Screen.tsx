import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../theme';

/** Content never grows wider than this, so tablets keep comfortable line lengths. */
export const MAX_CONTENT_WIDTH = 860;

export interface ScreenProps extends PropsWithChildren {
  edges?: Edge[];
}

export function Screen({ children, edges = ['top'] }: ScreenProps) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.inner}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  inner: { flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
});
