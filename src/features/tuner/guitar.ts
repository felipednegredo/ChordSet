import { nearestString, readingForString, type StringReading } from './frequency';
import { GUITAR_STANDARD_TUNING, type GuitarStringId } from './notes';

export type GuitarMode = 'auto' | GuitarStringId;

/** Resolves the reading for the guitar tuner in auto or fixed-string mode. */
export function guitarReading(frequency: number, mode: GuitarMode, a4: number): StringReading | null {
  if (mode === 'auto') return nearestString(frequency, GUITAR_STANDARD_TUNING, a4);
  const target = GUITAR_STANDARD_TUNING.find((s) => s.id === mode);
  return target ? readingForString(frequency, target, a4) : null;
}
