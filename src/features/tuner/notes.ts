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

export type GuitarStringId = 'E2' | 'A2' | 'D3' | 'G3' | 'B3' | 'E4';

export interface InstrumentString {
  id: GuitarStringId;
  /** 6 = lowest (thickest) string, 1 = highest. */
  number: number;
  name: NoteName;
  octave: number;
  midi: number;
}

/** Standard guitar tuning, from the 6th (low E) to the 1st string (high E). */
export const GUITAR_STANDARD_TUNING: readonly InstrumentString[] = [
  { id: 'E2', number: 6, name: 'E', octave: 2, midi: 40 },
  { id: 'A2', number: 5, name: 'A', octave: 2, midi: 45 },
  { id: 'D3', number: 4, name: 'D', octave: 3, midi: 50 },
  { id: 'G3', number: 3, name: 'G', octave: 3, midi: 55 },
  { id: 'B3', number: 2, name: 'B', octave: 3, midi: 59 },
  { id: 'E4', number: 1, name: 'E', octave: 4, midi: 64 },
];
