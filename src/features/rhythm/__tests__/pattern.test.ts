import {
  countLabels,
  formatPattern,
  normalizePatternText,
  parsePattern,
  PATTERN_PRESETS,
  stepDurationMs,
  stepsPerBeat,
} from '../pattern';

describe('parsePattern', () => {
  it('parses English and Portuguese letters, arrows and rests', () => {
    expect(parsePattern('D-DU-UDU')?.steps).toEqual([
      'down',
      'rest',
      'down',
      'up',
      'rest',
      'up',
      'down',
      'up',
    ]);
    expect(parsePattern('B C x _')?.steps).toEqual(['down', 'up', 'mute', 'rest']);
    expect(parsePattern('↓↑.')?.steps).toEqual(['down', 'up', 'rest']);
  });

  it('reads the repeat suffix in both orders', () => {
    expect(parsePattern('D-DU x2')?.repeats).toBe(2);
    expect(parsePattern('D-DU 3x')?.repeats).toBe(3);
    expect(parsePattern('D-DU')?.repeats).toBe(1);
    expect(parsePattern('DU x99')?.repeats).toBe(8);
  });

  it('does not confuse a muted stroke with the repeat suffix', () => {
    expect(parsePattern('DX')?.steps).toEqual(['down', 'mute']);
  });

  it('rejects empty, rest-only, unknown or too long patterns', () => {
    expect(parsePattern('')).toBeNull();
    expect(parsePattern('----')).toBeNull();
    expect(parsePattern('D-Q')).toBeNull();
    expect(parsePattern('DU'.repeat(9))).toBeNull();
  });
});

describe('formatPattern', () => {
  it('groups steps by beat', () => {
    expect(formatPattern(parsePattern('d-du-udu x2')!)).toBe('D- DU -U DU x2');
    expect(formatPattern(parsePattern('DUDUDUDUDUDUDUDU')!)).toBe('DUDU DUDU DUDU DUDU');
  });

  it('normalises valid text and keeps invalid text for the form to flag', () => {
    expect(normalizePatternText(' bcbc ')).toBe('DU DU');
    expect(normalizePatternText(' abc ')).toBe('abc');
  });

  it('keeps every preset valid', () => {
    PATTERN_PRESETS.forEach((preset) => expect(parsePattern(preset.pattern)).not.toBeNull());
  });
});

describe('timing helpers', () => {
  it('counts eighths up to 8 steps and sixteenths above', () => {
    expect(stepsPerBeat(8)).toBe(2);
    expect(stepsPerBeat(6)).toBe(2);
    expect(stepsPerBeat(16)).toBe(4);
    expect(stepsPerBeat(12)).toBe(4);
    expect(stepsPerBeat(10)).toBe(2);
  });

  it('labels the count', () => {
    expect(countLabels(8)).toEqual(['1', 'e', '2', 'e', '3', 'e', '4', 'e']);
    expect(countLabels(12).slice(0, 5)).toEqual(['1', '·', 'e', '·', '2']);
  });

  it('computes the step duration from the tempo', () => {
    expect(stepDurationMs(parsePattern('DUDUDUDU')!, 120)).toBe(250);
    expect(stepDurationMs(parsePattern('DUDUDUDUDUDUDUDU')!, 120)).toBe(125);
  });
});
