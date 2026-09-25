import { StreamClock } from '../streamClock';

describe('StreamClock', () => {
  it('is not ready before the first buffer', () => {
    expect(new StreamClock().toHostTime(0)).toBeNaN();
  });

  it('maps sample time to host time using the smallest bridge delay', () => {
    const clock = new StreamClock(30);
    // Stream started at host time 1000. 100 ms buffers at 48 kHz.
    clock.addBuffer(4800, 48000, 100, 1100 + 25); // 25 ms late
    clock.addBuffer(4800, 48000, 200, 1200 + 5); // 5 ms late → best estimate
    clock.addBuffer(4800, 48000, 300, 1300 + 40); // busy JS thread

    // A sound 250 ms after the first sample happened at host 1250 (+5 bridge, −30 latency).
    expect(clock.toHostTime(250)).toBeCloseTo(1225);
  });

  it('starts over after reset', () => {
    const clock = new StreamClock();
    clock.addBuffer(4800, 48000, 100, 1100);
    clock.reset();
    expect(clock.toHostTime(0)).toBeNaN();
  });
});
