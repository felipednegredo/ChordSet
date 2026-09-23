import { parseChord } from '../chord';
import {
  preferredAccidental,
  semitonesBetweenKeys,
  transposeChord,
  transposeKey,
  transposeNote,
} from '../transpose';

describe('transposeNote', () => {
  it('moves natural notes up one semitone using sharps', () => {
    expect(transposeNote('C', 1)).toBe('C#');
    expect(transposeNote('D', 1)).toBe('D#');
    expect(transposeNote('E', 1)).toBe('F');
    expect(transposeNote('B', 1)).toBe('C');
  });

  it('wraps around the octave in both directions', () => {
    expect(transposeNote('C', -1)).toBe('B');
    expect(transposeNote('A', 15)).toBe('C');
    expect(transposeNote('G', -14)).toBe('F');
  });

  it('supports flat spelling', () => {
    expect(transposeNote('A', 1, 'flat')).toBe('Bb');
    expect(transposeNote('Bb', 1, 'flat')).toBe('B');
    expect(transposeNote('Db', -1, 'flat')).toBe('C');
  });
});

describe('transposeChord', () => {
  it.each([
    ['C', 1, 'C#'],
    ['D', 1, 'D#'],
    ['E', 1, 'F'],
    ['Am', 2, 'Bm'],
    ['C#m', 1, 'Dm'],
    ['C#m', -1, 'Cm'],
    ['Bb', 2, 'C'],
    ['Bb', 1, 'B'],
    ['G7', 2, 'A7'],
    ['C/E', 2, 'D/F#'],
    ['F#m7', 1, 'Gm7'],
    ['Cmaj7', 5, 'Fmaj7'],
    ['E7M', 1, 'F7M'],
    ['Dsus4', -2, 'Csus4'],
    ['A7(9)', 3, 'C7(9)'],
    ['A7/9', 2, 'B7/9'],
    ['Bm7(b5)', 1, 'Cm7(b5)'],
    ['Ab/Eb', 1, 'A/E'],
    ['G/B', 12, 'G/B'],
  ])('%s %+d → %s', (chord, semitones, expected) => {
    expect(transposeChord(chord, semitones)).toBe(expected);
  });

  it('uses flats when requested, including the bass note', () => {
    expect(transposeChord('A', 1, 'flat')).toBe('Bb');
    expect(transposeChord('C/E', 3, 'flat')).toBe('Eb/G');
    expect(transposeChord('F#m7', 3, 'flat')).toBe('Am7');
    expect(transposeChord('G#7', 0, 'flat')).toBe('G#7');
  });

  it('returns unknown symbols untouched', () => {
    expect(transposeChord('N.C.', 2)).toBe('N.C.');
    expect(transposeChord('x2', 2)).toBe('x2');
    expect(transposeChord('', 2)).toBe('');
  });
});

describe('parseChord', () => {
  it('splits root, quality and bass', () => {
    expect(parseChord('F#m7/C#')).toEqual({ root: 'F#', quality: 'm7', bass: 'C#' });
    expect(parseChord('Bb')).toEqual({ root: 'Bb', quality: '', bass: null });
    expect(parseChord('C7/b9')).toEqual({ root: 'C', quality: '7/b9', bass: null });
  });

  it('rejects non-chords', () => {
    expect(parseChord('Hello')).toBeNull();
    expect(parseChord('c')).toBeNull();
  });
});

describe('keys', () => {
  it('transposes keys keeping minor quality', () => {
    expect(transposeKey('G', 2)).toBe('A');
    expect(transposeKey('Em', 1)).toBe('Fm');
    expect(transposeKey('C', 3)).toBe('D#');
  });

  it('keeps flat spelling for flat keys', () => {
    expect(transposeKey('Bb', 3)).toBe('Db');
    expect(transposeKey('F', 1)).toBe('Gb');
  });

  it('computes the shortest distance between keys', () => {
    expect(semitonesBetweenKeys('C', 'D')).toBe(2);
    expect(semitonesBetweenKeys('C', 'A')).toBe(-3);
    expect(semitonesBetweenKeys('G', 'F#')).toBe(-1);
    expect(semitonesBetweenKeys('Bb', 'A#')).toBe(0);
    expect(semitonesBetweenKeys('C', 'F#')).toBe(6);
    expect(semitonesBetweenKeys('x', 'C')).toBe(0);
  });

  it('suggests the accidental for a key', () => {
    expect(preferredAccidental('F')).toBe('flat');
    expect(preferredAccidental('Dm')).toBe('flat');
    expect(preferredAccidental('Eb')).toBe('flat');
    expect(preferredAccidental('E')).toBe('sharp');
    expect(preferredAccidental('F#m')).toBe('sharp');
    expect(preferredAccidental(null)).toBe('sharp');
  });
});
