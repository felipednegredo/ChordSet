import { type ChordInstrumentId, CHORD_INSTRUMENTS, diagramBaseFret, findFingerings } from '../diagrams';
import { chordPitches, chordTones, simplifyChord } from '../harmony';
import { mod12 } from '../notes';

const shape = (frets: number[]) => frets.map((fret) => (fret < 0 ? 'x' : String(fret))).join('');
const best = (symbol: string, instrument: ChordInstrumentId = 'guitar') =>
  shape(findFingerings(symbol, instrument)[0]?.frets ?? []);

describe('chordTones', () => {
  it.each([
    ['', [0, 4, 7]],
    ['m', [0, 3, 7]],
    ['7', [0, 4, 7, 10]],
    ['m7', [0, 3, 7, 10]],
    ['7M', [0, 4, 7, 11]],
    ['maj7', [0, 4, 7, 11]],
    ['9', [0, 4, 7, 2]],
    ['7(9)', [0, 4, 7, 10, 2]],
    ['7/9', [0, 4, 7, 10, 2]],
    ['4', [0, 7, 5]],
    ['sus2', [0, 7, 2]],
    ['°', [0, 3, 6, 9]],
    ['m7(b5)', [0, 3, 6, 10]],
    ['ø', [0, 3, 6, 10]],
    ['+', [0, 4, 8]],
    ['6', [0, 4, 7, 9]],
    ['5', [0, 7]],
  ])('%s', (quality, intervals) => {
    expect(chordTones(quality).intervals).toEqual(intervals);
  });

  it('lets the fifth be omitted only in four-note chords', () => {
    expect(chordTones('').optional).toEqual([]);
    expect(chordTones('7').optional).toEqual([7]);
  });
});

describe('chordPitches', () => {
  it('adds a slash bass outside the chord', () => {
    expect(chordPitches('C/Bb')).toEqual({ root: 0, bass: 10, pitchClasses: [0, 4, 7, 10], optional: [] });
  });

  it('rejects non-chords', () => {
    expect(chordPitches('Refrão')).toBeNull();
  });
});

describe('simplifyChord', () => {
  it.each([
    ['Am7(9)', 'Am'],
    ['G7M', 'G'],
    ['D/F#', 'D'],
    ['C9', 'C'],
    ['Bm7(b5)', 'B°'],
    ['C°', 'C°'],
    ['E5', 'E5'],
    ['Dsus4', 'D'],
    ['Bb+', 'Bb+'],
    ['xyz', 'xyz'],
  ])('%s → %s', (input, output) => {
    expect(simplifyChord(input)).toBe(output);
  });
});

describe('findFingerings', () => {
  it.each([
    ['C', 'x32010'],
    ['G', '320003'],
    ['D', 'xx0232'],
    ['A', 'x02220'],
    ['E', '022100'],
    ['Am', 'x02210'],
    ['Em', '022000'],
    ['Dm', 'xx0231'],
    ['F', '133211'],
    ['Bm', 'x24432'],
    ['G#m', '466444'],
    ['B7', 'x21202'],
    ['D/F#', '200232'],
  ])('guitar %s → %s', (symbol, expected) => {
    expect(best(symbol)).toBe(expected);
  });

  it.each([
    ['C', '0003'],
    ['G', '0232'],
    ['Am', '2000'],
    ['F', '2010'],
    ['Bb', '3211'],
  ])('ukulele %s → %s', (symbol, expected) => {
    expect(best(symbol, 'ukulele')).toBe(expected);
  });

  it.each([
    ['G', '0000'],
    ['D', '0234'],
    ['C', '2012'],
  ])('cavaquinho %s → %s', (symbol, expected) => {
    expect(best(symbol, 'cavaquinho')).toBe(expected);
  });

  it('only produces chord tones, with the bass lowest on guitar', () => {
    const symbols = ['C#m7', 'Ebmaj7', 'F#7(9)', 'Ab°', 'Bb/D', 'E7(4)', 'Gm6', 'A5'];
    for (const instrument of CHORD_INSTRUMENTS) {
      for (const symbol of symbols) {
        const pitches = chordPitches(symbol)!;
        const voicings = findFingerings(symbol, instrument.id);
        expect(voicings.length).toBeGreaterThan(0);
        for (const { frets } of voicings) {
          const sounding = frets
            .map((fret, index) => (fret < 0 ? null : instrument.strings[index] + fret))
            .filter((midi): midi is number => midi !== null);
          sounding.forEach((midi) => expect(pitches.pitchClasses).toContain(mod12(midi)));
          if (instrument.bassFirst) expect(mod12(Math.min(...sounding))).toBe(pitches.bass);
        }
      }
    }
  });

  it('returns nothing for text that is not a chord', () => {
    expect(findFingerings('N.C.', 'guitar')).toEqual([]);
  });
});

describe('diagramBaseFret', () => {
  it('starts at the nut for open shapes and at the lowest fret higher up', () => {
    expect(diagramBaseFret({ frets: [-1, 3, 2, 0, 1, 0], barre: null }, 5)).toBe(1);
    expect(diagramBaseFret({ frets: [4, 6, 6, 4, 4, 4], barre: { fret: 4, from: 0, to: 5 } }, 5)).toBe(4);
  });
});
