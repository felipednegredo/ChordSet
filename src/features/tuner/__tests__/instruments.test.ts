import { midiToFrequency } from '../frequency';
import { getInstrument, getTuning, INSTRUMENTS, isInstrumentId, stringReading } from '../instruments';

describe('instruments', () => {
  it('has unique tuning and string ids', () => {
    for (const instrument of INSTRUMENTS) {
      const tuningIds = instrument.tunings.map((t) => t.id);
      expect(new Set(tuningIds).size).toBe(tuningIds.length);
      expect(tuningIds[0]).toBe('standard');
      for (const tuning of instrument.tunings) {
        const ids = tuning.strings.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });

  it('keeps every open string inside the detection range', () => {
    for (const instrument of INSTRUMENTS) {
      for (const tuning of instrument.tunings) {
        for (const string of tuning.strings) {
          const frequency = midiToFrequency(string.midi);
          expect(frequency).toBeGreaterThan(instrument.minFrequency);
          expect(frequency).toBeLessThan(instrument.maxFrequency);
        }
      }
    }
  });

  it('numbers strings from the thinnest (1) to the thickest', () => {
    const drop = getTuning(getInstrument('guitar'), 'drop-d');
    expect(drop.strings.map((s) => `${s.number}:${s.id}`)).toEqual([
      '6:D2',
      '5:A2',
      '4:D3',
      '3:G3',
      '2:B3',
      '1:E4',
    ]);
    const ukulele = getTuning(getInstrument('ukulele'), 'standard');
    expect(ukulele.strings.map((s) => s.id)).toEqual(['G4', 'C4', 'E4', 'A4']);
  });

  it('falls back to the standard tuning and validates ids', () => {
    expect(getTuning(getInstrument('bass'), 'unknown').id).toBe('standard');
    expect(isInstrumentId('cavaquinho')).toBe(true);
    expect(isInstrumentId('theremin')).toBe(false);
  });

  it('reads the closest string of an alternate tuning', () => {
    const strings = getTuning(getInstrument('guitar'), 'drop-d').strings;
    const reading = stringReading(74, strings, 'auto', 440);
    expect(reading?.string.id).toBe('D2');
    expect(reading?.cents).toBeCloseTo(1200 * Math.log2(74 / midiToFrequency(38)), 6);
  });

  it('ignores a fixed string that is not part of the tuning', () => {
    const strings = getTuning(getInstrument('cavaquinho'), 'standard').strings;
    expect(stringReading(392, strings, 'E2', 440)?.string.id).toBe('G4');
  });
});
