/**
 * YIN fundamental frequency estimator.
 *
 * de Cheveigné, A. & Kawahara, H. (2002) "YIN, a fundamental frequency
 * estimator for speech and music". Implemented from the paper, no third-party code.
 *
 * Steps:
 *  1. difference function          d(τ) = Σ (x[j] - x[j+τ])²
 *  2. cumulative mean normalised   d'(τ) = d(τ) · τ / Σ_{k=1..τ} d(k)
 *  3. absolute threshold           first τ with d'(τ) < threshold (then walk to the local minimum)
 *  4. parabolic interpolation      refines τ with sub-sample precision
 */

export interface YinOptions {
  sampleRate: number;
  /** Lower = stricter. Typical values: 0.10 – 0.20. */
  threshold?: number;
  minFrequency?: number;
  maxFrequency?: number;
}

export interface PitchEstimate {
  frequency: number;
  /** 0..1 — confidence derived from the normalised difference at the chosen lag. */
  probability: number;
}

export const YIN_DEFAULTS = {
  threshold: 0.15,
  minFrequency: 60,
  maxFrequency: 1400,
} as const;

export function detectPitchYin(buffer: Float32Array, options: YinOptions): PitchEstimate | null {
  const {
    sampleRate,
    threshold = YIN_DEFAULTS.threshold,
    minFrequency = YIN_DEFAULTS.minFrequency,
    maxFrequency = YIN_DEFAULTS.maxFrequency,
  } = options;

  if (sampleRate <= 0 || buffer.length < 4) return null;

  const tauMin = Math.max(2, Math.floor(sampleRate / maxFrequency));
  const tauMax = Math.min(Math.floor(sampleRate / minFrequency), Math.floor(buffer.length / 2));
  if (tauMax <= tauMin + 1) return null;

  const windowSize = buffer.length - tauMax;
  const cmnd = new Float32Array(tauMax + 1);

  // Steps 1 + 2: difference function and cumulative mean normalisation.
  cmnd[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau <= tauMax; tau += 1) {
    let sum = 0;
    for (let j = 0; j < windowSize; j += 1) {
      const delta = buffer[j] - buffer[j + tau];
      sum += delta * delta;
    }
    runningSum += sum;
    cmnd[tau] = runningSum === 0 ? 1 : (sum * tau) / runningSum;
  }

  // Step 3: absolute threshold.
  let tauEstimate = -1;
  for (let tau = tauMin; tau < tauMax; tau += 1) {
    if (cmnd[tau] < threshold) {
      while (tau + 1 < tauMax && cmnd[tau + 1] < cmnd[tau]) tau += 1;
      tauEstimate = tau;
      break;
    }
  }
  if (tauEstimate === -1) return null;

  // Step 4: parabolic interpolation around the minimum.
  const betterTau = parabolicInterpolation(cmnd, tauEstimate);
  const frequency = sampleRate / betterTau;
  if (!Number.isFinite(frequency) || frequency < minFrequency || frequency > maxFrequency) return null;

  return { frequency, probability: Math.max(0, Math.min(1, 1 - cmnd[tauEstimate])) };
}

function parabolicInterpolation(values: Float32Array, index: number): number {
  if (index <= 0 || index >= values.length - 1) return index;
  const s0 = values[index - 1];
  const s1 = values[index];
  const s2 = values[index + 1];
  const denominator = s0 + s2 - 2 * s1;
  if (denominator === 0) return index;
  return index + (s0 - s2) / (2 * denominator);
}
