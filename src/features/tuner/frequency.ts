import { A4_MIDI, type InstrumentString, type NoteName, noteFromMidi } from './notes';

export const DEFAULT_A4 = 440;
export const MIN_A4 = 415;
export const MAX_A4 = 466;

/** Cents window considered "in tune". */
export const IN_TUNE_CENTS = 5;

export function midiToFrequency(midi: number, a4: number = DEFAULT_A4): number {
  return a4 * 2 ** ((midi - A4_MIDI) / 12);
}

/** Fractional MIDI number for a frequency (e.g. 440 Hz → 69). */
export function frequencyToMidi(frequency: number, a4: number = DEFAULT_A4): number {
  return A4_MIDI + 12 * Math.log2(frequency / a4);
}

/** Difference in cents between a frequency and a reference (positive = sharp). */
export function centsBetween(frequency: number, reference: number): number {
  return 1200 * Math.log2(frequency / reference);
}

export interface NoteReading {
  name: NoteName;
  octave: number;
  midi: number;
  /** Detected frequency in Hz. */
  frequency: number;
  /** Exact frequency of the nearest note in Hz. */
  targetFrequency: number;
  /** Deviation from the target in cents, in the range -50..50. */
  cents: number;
}

/** Chromatic mode: nearest equal-tempered note to a frequency. */
export function frequencyToNote(frequency: number, a4: number = DEFAULT_A4): NoteReading | null {
  if (!Number.isFinite(frequency) || frequency <= 0) return null;
  const midi = Math.round(frequencyToMidi(frequency, a4));
  const note = noteFromMidi(midi);
  const targetFrequency = midiToFrequency(midi, a4);
  return {
    name: note.name,
    octave: note.octave,
    midi,
    frequency,
    targetFrequency,
    cents: centsBetween(frequency, targetFrequency),
  };
}

export type TuningStatus = 'flat' | 'in-tune' | 'sharp';

export function tuningStatus(cents: number, tolerance: number = IN_TUNE_CENTS): TuningStatus {
  if (cents < -tolerance) return 'flat';
  if (cents > tolerance) return 'sharp';
  return 'in-tune';
}

export interface StringReading {
  string: InstrumentString;
  frequency: number;
  targetFrequency: number;
  cents: number;
}

/** Compares a frequency against a specific string. Cents may exceed ±50 when far off. */
export function readingForString(
  frequency: number,
  string: InstrumentString,
  a4: number = DEFAULT_A4,
): StringReading {
  const targetFrequency = midiToFrequency(string.midi, a4);
  return { string, frequency, targetFrequency, cents: centsBetween(frequency, targetFrequency) };
}

/** Auto mode: picks the string whose target is closest (in cents) to the frequency. */
export function nearestString(
  frequency: number,
  strings: readonly InstrumentString[],
  a4: number = DEFAULT_A4,
): StringReading | null {
  if (!Number.isFinite(frequency) || frequency <= 0 || strings.length === 0) return null;
  let best: StringReading | null = null;
  for (const string of strings) {
    const reading = readingForString(frequency, string, a4);
    if (!best || Math.abs(reading.cents) < Math.abs(best.cents)) best = reading;
  }
  return best;
}
