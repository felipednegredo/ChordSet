import { OnsetDetector } from '../onset';

const SAMPLE_RATE = 48000;

/** Deterministic pseudo-random noise so the test never flakes. */
function noise(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 2147483648 - 1;
  };
}

/** Strum-like bursts: broadband attack plus a decaying 196 Hz tone, over a low noise floor. */
function strums(timesMs: number[], lengthMs: number, amplitude = 0.5): Float32Array {
  const out = new Float32Array(Math.round((lengthMs / 1000) * SAMPLE_RATE));
  const random = noise(42);
  for (let i = 0; i < out.length; i += 1) out[i] = random() * 0.002;
  timesMs.forEach((time) => {
    const start = Math.round((time / 1000) * SAMPLE_RATE);
    for (let i = start; i < out.length; i += 1) {
      const t = (i - start) / SAMPLE_RATE;
      const scratch = random() * Math.exp(-t / 0.01);
      const tone = Math.sin(2 * Math.PI * 196 * t) * Math.exp(-t / 0.25);
      out[i] += amplitude * (0.6 * scratch + 0.4 * tone);
    }
  });
  return out;
}

function detect(samples: Float32Array, chunk = 2048): number[] {
  const detector = new OnsetDetector();
  const onsets: number[] = [];
  for (let i = 0; i < samples.length; i += chunk) {
    onsets.push(...detector.push(samples.subarray(i, i + chunk), SAMPLE_RATE));
  }
  return onsets;
}

describe('OnsetDetector', () => {
  it('finds each strum within a few milliseconds', () => {
    const times = [200, 575, 950, 1137, 1325, 1700];
    const onsets = detect(strums(times, 2200));
    expect(onsets).toHaveLength(times.length);
    onsets.forEach((onset, i) => expect(Math.abs(onset - times[i])).toBeLessThan(10));
  });

  it('ignores silence and background noise', () => {
    expect(detect(strums([], 1500))).toEqual([]);
  });

  it('ignores quiet sounds below the level gate', () => {
    expect(detect(strums([300, 800], 1200, 0.004))).toEqual([]);
  });

  it('is independent of the buffer size', () => {
    const samples = strums([100, 400, 700], 1000);
    expect(detect(samples, 333)).toEqual(detect(samples, 4096));
  });
});
