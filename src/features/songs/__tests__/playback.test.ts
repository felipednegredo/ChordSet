import { autoScrollPixelsPerSecond, computePlaybackDisplay, stepKey } from '../playback';
import { getSongFormErrors, validateSongInput } from '../songValidation';

describe('computePlaybackDisplay', () => {
  it('returns no transposition when keys match and there is no capo', () => {
    expect(computePlaybackDisplay({ originalKey: 'G', soundingKey: 'G', capo: 0 })).toEqual({
      semitones: 0,
      shapesKey: 'G',
      accidental: 'sharp',
    });
  });

  it('transposes to the sounding key', () => {
    expect(computePlaybackDisplay({ originalKey: 'G', soundingKey: 'A', capo: 0 }).semitones).toBe(2);
  });

  it('shows capo shapes: sounding B with capo 2 → shapes in A', () => {
    const display = computePlaybackDisplay({ originalKey: 'G', soundingKey: 'B', capo: 2 });
    expect(display.shapesKey).toBe('A');
    expect(display.semitones).toBe(2);
  });

  it('uses flats for flat shape keys', () => {
    expect(computePlaybackDisplay({ originalKey: 'C', soundingKey: 'F', capo: 0 }).accidental).toBe('flat');
  });
});

describe('stepKey', () => {
  it('steps with sharps for sharp original keys', () => {
    expect(stepKey('C', 1, 'C')).toBe('C#');
    expect(stepKey('D', 1, 'C')).toBe('D#');
    expect(stepKey('E', 1, 'G')).toBe('F');
    expect(stepKey('Am', -1, 'Am')).toBe('G#m');
  });

  it('keeps flats for flat original keys', () => {
    expect(stepKey('Bb', 1, 'F')).toBe('B');
    expect(stepKey('F', 1, 'F')).toBe('Gb');
  });
});

describe('auto-scroll speed', () => {
  it('maps and clamps levels', () => {
    expect(autoScrollPixelsPerSecond(1)).toBe(6);
    expect(autoScrollPixelsPerSecond(0)).toBe(6);
    expect(autoScrollPixelsPerSecond(10)).toBe(76);
    expect(autoScrollPixelsPerSecond(99)).toBe(76);
  });
});

describe('song validation', () => {
  const valid = {
    title: ' Song ',
    artist: 'Band',
    originalKey: 'G',
    currentKey: 'A',
    capo: 3.4,
    content: '[G]x',
  };

  it('normalises valid input', () => {
    expect(validateSongInput(valid)).toEqual({
      title: 'Song',
      artist: 'Band',
      originalKey: 'G',
      currentKey: 'A',
      capo: 3,
      content: '[G]x',
      favorite: false,
    });
  });

  it('reports missing fields', () => {
    expect(getSongFormErrors({ ...valid, title: ' ', originalKey: 'H', content: '' })).toEqual({
      title: 'Informe o título.',
      originalKey: 'Selecione o tom original.',
      content: 'Cole ou escreva a cifra.',
    });
    expect(() => validateSongInput({ ...valid, title: '' })).toThrow('Informe o título.');
  });
});
