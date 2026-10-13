import { nearestString, readingForString, type StringReading } from './frequency';
import { GUITAR_STANDARD_TUNING, type InstrumentString, stringsFromMidi } from './notes';

/**
 * Instruments and alternate tunings offered by the tuner. MIDI numbers go from
 * the thickest string to the thinnest one, as they appear on the headstock.
 */

export type InstrumentId = 'guitar' | 'bass' | 'ukulele' | 'cavaquinho' | 'mandolin';

export interface Tuning {
  id: string;
  name: string;
  strings: readonly InstrumentString[];
}

export interface Instrument {
  id: InstrumentId;
  name: string;
  tunings: readonly Tuning[];
  /** Pitch-detection range in Hz (lowest fundamental minus a margin, highest plus a margin). */
  minFrequency: number;
  maxFrequency: number;
}

function tuning(id: string, name: string, midis: readonly number[]): Tuning {
  return { id, name, strings: stringsFromMidi(midis) };
}

export const INSTRUMENTS: readonly Instrument[] = [
  {
    id: 'guitar',
    name: 'Violão / Guitarra',
    minFrequency: 55,
    maxFrequency: 1400,
    tunings: [
      { id: 'standard', name: 'Padrão (E A D G B E)', strings: GUITAR_STANDARD_TUNING },
      tuning('half-down', 'Meio tom abaixo (Eb)', [39, 44, 49, 54, 58, 63]),
      tuning('whole-down', 'Um tom abaixo (D)', [38, 43, 48, 53, 57, 62]),
      tuning('drop-d', 'Drop D (D A D G B E)', [38, 45, 50, 55, 59, 64]),
      tuning('drop-c', 'Drop C (C G C F A D)', [36, 43, 48, 53, 57, 62]),
      tuning('open-g', 'Open G (D G D G B D)', [38, 43, 50, 55, 59, 62]),
      tuning('open-d', 'Open D (D A D F# A D)', [38, 45, 50, 54, 57, 62]),
      tuning('open-e', 'Open E (E B E G# B E)', [40, 47, 52, 56, 59, 64]),
      tuning('dadgad', 'DADGAD', [38, 45, 50, 55, 57, 62]),
    ],
  },
  {
    id: 'bass',
    name: 'Baixo',
    minFrequency: 27,
    maxFrequency: 600,
    tunings: [
      tuning('standard', 'Padrão 4 cordas (E A D G)', [28, 33, 38, 43]),
      tuning('five', '5 cordas (B E A D G)', [23, 28, 33, 38, 43]),
      tuning('drop-d', 'Drop D (D A D G)', [26, 33, 38, 43]),
      tuning('half-down', 'Meio tom abaixo (Eb)', [27, 32, 37, 42]),
    ],
  },
  {
    id: 'ukulele',
    name: 'Ukulele',
    minFrequency: 120,
    maxFrequency: 1400,
    tunings: [
      tuning('standard', 'Padrão (G C E A)', [67, 60, 64, 69]),
      tuning('low-g', 'G grave (G C E A)', [55, 60, 64, 69]),
      tuning('baritone', 'Barítono (D G B E)', [50, 55, 59, 64]),
    ],
  },
  {
    id: 'cavaquinho',
    name: 'Cavaquinho',
    minFrequency: 200,
    maxFrequency: 1400,
    tunings: [
      tuning('standard', 'Padrão (D G B D)', [62, 67, 71, 74]),
      tuning('natural', 'Natural (D G B E)', [62, 67, 71, 76]),
    ],
  },
  {
    id: 'mandolin',
    name: 'Bandolim',
    minFrequency: 160,
    maxFrequency: 1400,
    tunings: [tuning('standard', 'Padrão (G D A E)', [55, 62, 69, 76])],
  },
];

export const DEFAULT_INSTRUMENT: InstrumentId = 'guitar';
export const DEFAULT_TUNING = 'standard';

export function isInstrumentId(value: unknown): value is InstrumentId {
  return INSTRUMENTS.some((instrument) => instrument.id === value);
}

export function getInstrument(id: InstrumentId): Instrument {
  return INSTRUMENTS.find((instrument) => instrument.id === id) ?? INSTRUMENTS[0];
}

/** Returns the tuning, falling back to the instrument's first (standard) tuning. */
export function getTuning(instrument: Instrument, tuningId: string): Tuning {
  return instrument.tunings.find((t) => t.id === tuningId) ?? instrument.tunings[0];
}

/** `auto` detects the closest string; otherwise the id of the string to tune. */
export type StringMode = 'auto' | string;

/** Resolves the reading for an instrument tuner in auto or fixed-string mode. */
export function stringReading(
  frequency: number,
  strings: readonly InstrumentString[],
  mode: StringMode,
  a4: number,
): StringReading | null {
  const target = mode === 'auto' ? undefined : strings.find((s) => s.id === mode);
  return target ? readingForString(frequency, target, a4) : nearestString(frequency, strings, a4);
}
