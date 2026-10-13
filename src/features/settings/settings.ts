import { type ChordInstrumentId, DEFAULT_CHORD_INSTRUMENT, isChordInstrumentId } from '../chords/diagrams';
import { DEFAULT_A4, MAX_A4, MIN_A4 } from '../tuner/frequency';
import { DEFAULT_INSTRUMENT, DEFAULT_TUNING, type InstrumentId, isInstrumentId } from '../tuner/instruments';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface AppSettings {
  themeMode: ThemeMode;
  /** Lyrics font size in the chord viewer. */
  sheetFontSize: number;
  /** Auto-scroll speed level (1 = slowest). */
  autoScrollSpeed: number;
  /** Tuner reference frequency for A4. */
  a4Reference: number;
  tunerInstrument: InstrumentId;
  /** Tuning id inside the selected instrument (falls back to standard when unknown). */
  tunerTuning: string;
  /** Vibrate when a string reaches the in-tune zone. */
  tunerHaptics: boolean;
  /** Instrument used for chord diagrams in the viewer. */
  chordInstrument: ChordInstrumentId;
  /** Mirror chord diagrams for left-handed players. */
  leftHanded: boolean;
  /** Show the chord diagram strip in the viewer. */
  showDiagrams: boolean;
  /** Replace extended chords (Am7(9), G7M) with basic ones (Am, G). */
  simplifyChords: boolean;
}

export const FONT_SIZE_RANGE = { min: 14, max: 40, step: 2 } as const;
export const SCROLL_SPEED_RANGE = { min: 1, max: 10 } as const;

export const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'system',
  sheetFontSize: 20,
  autoScrollSpeed: 3,
  a4Reference: DEFAULT_A4,
  tunerInstrument: DEFAULT_INSTRUMENT,
  tunerTuning: DEFAULT_TUNING,
  tunerHaptics: true,
  chordInstrument: DEFAULT_CHORD_INSTRUMENT,
  leftHanded: false,
  showDiagrams: false,
  simplifyChords: false,
};

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

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
    tunerInstrument: isInstrumentId(value.tunerInstrument)
      ? value.tunerInstrument
      : DEFAULT_SETTINGS.tunerInstrument,
    tunerTuning:
      typeof value.tunerTuning === 'string' && value.tunerTuning
        ? value.tunerTuning
        : DEFAULT_SETTINGS.tunerTuning,
    tunerHaptics: bool(value.tunerHaptics, DEFAULT_SETTINGS.tunerHaptics),
    chordInstrument: isChordInstrumentId(value.chordInstrument)
      ? value.chordInstrument
      : DEFAULT_SETTINGS.chordInstrument,
    leftHanded: bool(value.leftHanded, DEFAULT_SETTINGS.leftHanded),
    showDiagrams: bool(value.showDiagrams, DEFAULT_SETTINGS.showDiagrams),
    simplifyChords: bool(value.simplifyChords, DEFAULT_SETTINGS.simplifyChords),
  };
}
