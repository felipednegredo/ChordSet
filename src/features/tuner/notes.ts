/** Musical note definitions used by the tuner (independent from the UI). */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type NoteName = (typeof NOTE_NAMES)[number];

/** MIDI note number of A4. */
export const A4_MIDI = 69;

export interface NoteInfo {
  name: NoteName;
  octave: number;
  midi: number;
}

export function noteFromMidi(midi: number): NoteInfo {
  const rounded = Math.round(midi);
  const index = ((rounded % 12) + 12) % 12;
  return { name: NOTE_NAMES[index], octave: Math.floor(rounded / 12) - 1, midi: rounded };
}

export function formatNote(note: Pick<NoteInfo, 'name' | 'octave'>): string {
  return `${note.name}${note.octave}`;
}

export interface InstrumentString {
  /** Note and octave (e.g. "E2"); unique inside a tuning. */
  id: string;
  /** 1 = highest-pitched course in standard order; the largest number is the lowest string. */
  number: number;
  name: NoteName;
  octave: number;
  midi: number;
}

/** Builds strings from MIDI numbers listed from the lowest-numbered string (thickest) to the highest. */
export function stringsFromMidi(midis: readonly number[]): InstrumentString[] {
  return midis.map((midi, index) => {
    const note = noteFromMidi(midi);
    return { id: formatNote(note), number: midis.length - index, name: note.name, octave: note.octave, midi };
  });
}

/** Standard guitar tuning, from the 6th (low E) to the 1st string (high E). */
export const GUITAR_STANDARD_TUNING: readonly InstrumentString[] = stringsFromMidi([40, 45, 50, 55, 59, 64]);
