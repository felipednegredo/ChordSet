import {
  DarkTheme,
  DefaultTheme,
  type ErrorBoundaryProps,
  Stack,
  type Theme,
  ThemeProvider,
} from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { Suspense, useEffect, useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorState, LoadingView } from '../src/components';
import { DATABASE_NAME } from '../src/database/constants';
import { initializeDatabase } from '../src/database/migrate';
import { SettingsProvider } from '../src/features/settings/SettingsProvider';
import { AppThemeProvider, useTheme } from '../src/theme';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <ErrorState message={error.message} onRetry={retry} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AppThemeProvider>
          <ThemedApp />
        </AppThemeProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

function ThemedApp() {
  const { colors, scheme } = useTheme();

  const navigationTheme = useMemo<Theme>(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.accent,
        background: colors.background,
        card: colors.background,
        text: colors.text,
        border: colors.border,
        notification: colors.accent,
      },
    };
  }, [colors, scheme]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, [colors.background]);

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Suspense fallback={<LoadingView />}>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeDatabase} useSuspense>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              headerShadowVisible: false,
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="song/[id]" options={{ title: '' }} />
            <Stack.Screen name="song/new" options={{ title: 'Nova cifra', presentation: 'modal' }} />
            <Stack.Screen name="song/edit" options={{ title: 'Editar cifra', presentation: 'modal' }} />
            <Stack.Screen
              name="song/add-to-repertoire"
              options={{ title: 'Adicionar ao repertório', presentation: 'modal' }}
            />
            <Stack.Screen name="repertoire/[id]" options={{ title: '' }} />
            <Stack.Screen
              name="repertoire/new"
              options={{ title: 'Novo repertório', presentation: 'modal' }}
            />
            <Stack.Screen
              name="repertoire/edit"
              options={{ title: 'Editar repertório', presentation: 'modal' }}
            />
            <Stack.Screen
              name="repertoire/add-songs"
              options={{ title: 'Adicionar músicas', presentation: 'modal' }}
            />
            <Stack.Screen name="repertoire/entry" options={{ title: 'Tom e capo', presentation: 'modal' }} />
            <Stack.Screen name="settings" options={{ title: 'Ajustes', presentation: 'modal' }} />
          </Stack>
        </SQLiteProvider>
      </Suspense>
    </ThemeProvider>
  );
}
