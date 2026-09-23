import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { type ColorPalette, darkColors, lightColors } from './colors';
import { useSettings } from '../features/settings/SettingsProvider';

export type ColorScheme = 'light' | 'dark';

export interface AppTheme {
  scheme: ColorScheme;
  colors: ColorPalette;
}

const ThemeContext = createContext<AppTheme>({ scheme: 'dark', colors: darkColors });

/** Resolves the active palette from the user setting (system / light / dark). */
export function AppThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const { settings } = useSettings();
  const scheme: ColorScheme =
    settings.themeMode === 'system' ? (system === 'light' ? 'light' : 'dark') : settings.themeMode;

  const value = useMemo<AppTheme>(
    () => ({ scheme, colors: scheme === 'dark' ? darkColors : lightColors }),
    [scheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): AppTheme {
  return useContext(ThemeContext);
}
