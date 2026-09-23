import { DEFAULT_A4, MAX_A4, MIN_A4 } from '../tuner/frequency';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface AppSettings {
  themeMode: ThemeMode;
  /** Lyrics font size in the chord viewer. */
  sheetFontSize: number;
  /** Auto-scroll speed level (1 = slowest). */
  autoScrollSpeed: number;
  /** Tuner reference frequency for A4. */
  a4Reference: number;
}

export const FONT_SIZE_RANGE = { min: 14, max: 40, step: 2 } as const;
export const SCROLL_SPEED_RANGE = { min: 1, max: 10 } as const;

export const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'system',
  sheetFontSize: 20,
  autoScrollSpeed: 3,
  a4Reference: DEFAULT_A4,
};

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

/** Validates persisted JSON so a corrupt value never crashes the app. */
export function sanitizeSettings(raw: unknown): AppSettings {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof AppSettings, unknown>>;
  const themeMode: ThemeMode =
    value.themeMode === 'light' || value.themeMode === 'dark' || value.themeMode === 'system'
      ? value.themeMode
      : DEFAULT_SETTINGS.themeMode;
  return {
    themeMode,
    sheetFontSize: clamp(
      value.sheetFontSize,
      FONT_SIZE_RANGE.min,
      FONT_SIZE_RANGE.max,
      DEFAULT_SETTINGS.sheetFontSize,
    ),
    autoScrollSpeed: clamp(
      value.autoScrollSpeed,
      SCROLL_SPEED_RANGE.min,
      SCROLL_SPEED_RANGE.max,
      DEFAULT_SETTINGS.autoScrollSpeed,
    ),
    a4Reference: clamp(value.a4Reference, MIN_A4, MAX_A4, DEFAULT_SETTINGS.a4Reference),
  };
}
