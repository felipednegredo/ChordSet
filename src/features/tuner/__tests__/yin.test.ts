import { PitchAnalyzer } from '../analyzer';
import { decodePcm, downsample, rms } from '../pcm';
import { detectPitchYin } from '../yin';

const SAMPLE_RATE = 44100;

function sine(frequency: number, length: number, sampleRate = SAMPLE_RATE, amplitude = 0.5): Float32Array {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1)
    out[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / sampleRate);
  return out;
}

/** Plucked-string-like tone: strong harmonics, weak fundamental. */
function harmonicTone(frequency: number, length: number, sampleRate = SAMPLE_RATE): Float32Array {
  const out = new Float32Array(length);
  const partials = [0.4, 0.8, 0.5, 0.3, 0.2];
  for (let i = 0; i < length; i += 1) {
    let value = 0;
    partials.forEach((amp, k) => {
      value += amp * Math.sin((2 * Math.PI * frequency * (k + 1) * i) / sampleRate);
    });
    out[i] = value / 3;
  }
  return out;
}

function expectCents(actual: number, expected: number, maxCents: number) {
  const cents = Math.abs(1200 * Math.log2(actual / expected));
  expect(cents).toBeLessThan(maxCents);
}

describe('detectPitchYin', () => {
  it.each([82.41, 110, 146.83, 196, 246.94, 329.63, 440, 880])('detects a %p Hz sine', (frequency) => {
    const result = detectPitchYin(sine(frequency, 4096), { sampleRate: SAMPLE_RATE });
    expect(result).not.toBeNull();
    expectCents(result!.frequency, frequency, 2);
    expect(result!.probability).toBeGreaterThan(0.8);
  });

  it('detects the fundamental of a harmonic-rich tone (low E string)', () => {
    const result = detectPitchYin(harmonicTone(82.41, 4096), { sampleRate: SAMPLE_RATE });
    expect(result).not.toBeNull();
    expectCents(result!.frequency, 82.41, 3);
  });

  it('returns null for silence and white noise', () => {
    expect(detectPitchYin(new Float32Array(4096), { sampleRate: SAMPLE_RATE })).toBeNull();
    let seed = 42;
    const noise = new Float32Array(4096).map(() => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed / 2 ** 30 - 1;
    });
    expect(detectPitchYin(noise, { sampleRate: SAMPLE_RATE, threshold: 0.1 })).toBeNull();
  });

  it('respects the frequency range', () => {
    expect(detectPitchYin(sine(1000, 4096), { sampleRate: SAMPLE_RATE, maxFrequency: 500 })).toBeNull();
  });
});

describe('pcm helpers', () => {
  it('decodes int16 little-endian PCM', () => {
    const pcm = new Int16Array([0, 16384, -32768, 32767]);
    const decoded = decodePcm(pcm.buffer, 'int16');
    expect(Array.from(decoded)).toEqual([0, 0.5, -1, 32767 / 32768]);
  });

  it('downmixes interleaved stereo float32', () => {
    const pcm = new Float32Array([1, 0, 0.5, 0.5]);
    expect(Array.from(decodePcm(pcm.buffer, 'float32', 2))).toEqual([0.5, 0.5]);
  });

  it('computes RMS and decimates', () => {
    expect(rms(new Float32Array([1, -1, 1, -1]))).toBe(1);
    expect(Array.from(downsample(new Float32Array([1, 3, 5, 7]), 2))).toEqual([2, 6]);
  });
});

describe('PitchAnalyzer', () => {
  it('streams chunks of 48 kHz audio and reports a stable pitch', () => {
    const analyzer = new PitchAnalyzer();
    const signal = harmonicTone(110, 48000, 48000);
    let last: number | null = null;
    for (let offset = 0; offset < signal.length; offset += 960) {
      const frame = analyzer.push(signal.subarray(offset, offset + 960), 48000);
      if (frame?.frequency) last = frame.frequency;
    }
    expect(last).not.toBeNull();
    expectCents(last!, 110, 3);
  });

  it('gates silence', () => {
    const analyzer = new PitchAnalyzer();
    let frame = null;
    for (let i = 0; i < 20; i += 1) frame = analyzer.push(new Float32Array(1024), 44100) ?? frame;
    expect(frame).toEqual({ frequency: null, probability: 0, level: 0 });
  });
});
