import {
  centsBetween,
  frequencyToMidi,
  frequencyToNote,
  midiToFrequency,
  nearestString,
  tuningStatus,
} from '../frequency';
import { guitarReading } from '../guitar';
import { GUITAR_STANDARD_TUNING, noteFromMidi } from '../notes';

describe('frequency ↔ MIDI', () => {
  it('maps A4 to 440 Hz', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 6);
    expect(frequencyToMidi(440)).toBeCloseTo(69, 6);
  });

  it('supports a custom A4 reference', () => {
    expect(midiToFrequency(69, 442)).toBeCloseTo(442, 6);
    expect(frequencyToMidi(442, 442)).toBeCloseTo(69, 6);
  });

  it('computes guitar string frequencies', () => {
    const expected = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];
    GUITAR_STANDARD_TUNING.forEach((string, index) => {
      expect(midiToFrequency(string.midi)).toBeCloseTo(expected[index], 1);
    });
  });
});

describe('noteFromMidi', () => {
  it('names notes with octave', () => {
    expect(noteFromMidi(60)).toEqual({ name: 'C', octave: 4, midi: 60 });
    expect(noteFromMidi(61)).toEqual({ name: 'C#', octave: 4, midi: 61 });
    expect(noteFromMidi(40)).toEqual({ name: 'E', octave: 2, midi: 40 });
  });
});

describe('frequencyToNote', () => {
  it('detects the 12 chromatic notes', () => {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    names.forEach((name, index) => {
      const reading = frequencyToNote(midiToFrequency(60 + index));
      expect(reading?.name).toBe(name);
      expect(reading?.octave).toBe(4);
      expect(reading?.cents).toBeCloseTo(0, 6);
    });
  });

  it('reports deviation in cents', () => {
    const sharp = frequencyToNote(445);
    expect(sharp?.name).toBe('A');
    expect(sharp?.cents).toBeCloseTo(19.56, 1);

    const flat = frequencyToNote(435);
    expect(flat?.name).toBe('A');
    expect(flat?.cents).toBeCloseTo(-19.78, 1);
  });

  it('rounds to the nearest note beyond 50 cents', () => {
    expect(frequencyToNote(midiToFrequency(69.6))?.name).toBe('A#');
    expect(frequencyToNote(midiToFrequency(69.4))?.name).toBe('A');
  });

  it('rejects invalid frequencies', () => {
    expect(frequencyToNote(0)).toBeNull();
    expect(frequencyToNote(-10)).toBeNull();
    expect(frequencyToNote(Number.NaN)).toBeNull();
  });
});

describe('cents', () => {
  it('measures an octave as 1200 cents and a semitone as 100', () => {
    expect(centsBetween(880, 440)).toBeCloseTo(1200, 6);
    expect(centsBetween(midiToFrequency(70), midiToFrequency(69))).toBeCloseTo(100, 6);
    expect(centsBetween(440, 440)).toBe(0);
  });

  it('classifies tuning status', () => {
    expect(tuningStatus(-12)).toBe('flat');
    expect(tuningStatus(3)).toBe('in-tune');
    expect(tuningStatus(-5)).toBe('in-tune');
    expect(tuningStatus(8)).toBe('sharp');
  });
});

describe('guitar strings', () => {
  it('finds the nearest string in auto mode', () => {
    expect(nearestString(83, GUITAR_STANDARD_TUNING)?.string.id).toBe('E2');
    expect(nearestString(108, GUITAR_STANDARD_TUNING)?.string.id).toBe('A2');
    expect(nearestString(250, GUITAR_STANDARD_TUNING)?.string.id).toBe('B3');
    expect(nearestString(330, GUITAR_STANDARD_TUNING)?.string.id).toBe('E4');
  });

  it('measures against a fixed string even when far off', () => {
    const reading = guitarReading(100, 'A2', 440);
    expect(reading?.string.id).toBe('A2');
    expect(reading?.cents).toBeCloseTo(-165, 0);
  });
});
