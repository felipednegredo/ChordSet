/** Helpers to turn raw PCM buffers into normalised mono Float32 samples. */

export type PcmEncoding = 'float32' | 'int16';

/**
 * Decodes interleaved PCM (little-endian) into mono samples in the -1..1 range.
 * Multi-channel audio is averaged.
 */
export function decodePcm(data: ArrayBuffer, encoding: PcmEncoding, channels: number = 1): Float32Array {
  const source = encoding === 'float32' ? new Float32Array(data) : new Int16Array(data);
  const scale = encoding === 'int16' ? 1 / 32768 : 1;
  const channelCount = Math.max(1, Math.floor(channels));
  const frames = Math.floor(source.length / channelCount);
  const out = new Float32Array(frames);

  for (let frame = 0; frame < frames; frame += 1) {
    let sum = 0;
    for (let ch = 0; ch < channelCount; ch += 1) sum += source[frame * channelCount + ch];
    out[frame] = (sum / channelCount) * scale;
  }
  return out;
}

/** Root mean square level (0..1). Used as a noise gate. */
export function rms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

/**
 * Integer-factor decimation with a box filter (average of each group).
 * Reduces CPU usage of YIN; a guitar fundamental stays far below the new Nyquist.
 */
export function downsample(samples: Float32Array, factor: number): Float32Array {
  const step = Math.max(1, Math.floor(factor));
  if (step === 1) return samples;
  const out = new Float32Array(Math.floor(samples.length / step));
  for (let i = 0; i < out.length; i += 1) {
    let sum = 0;
    const offset = i * step;
    for (let k = 0; k < step; k += 1) sum += samples[offset + k];
    out[i] = sum / step;
  }
  return out;
}
