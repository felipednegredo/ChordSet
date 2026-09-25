import { RhythmGrader } from '../grader';
import { parsePattern } from '../pattern';

// "D- DU" at 120 BPM: steps every 250 ms → down, rest, down, up.
const pattern = parsePattern('D-DU')!;

describe('RhythmGrader', () => {
  it('judges hits, early/late strokes, misses and rests', () => {
    const grader = new RhythmGrader(pattern, 120);
    grader.addOnset(10); // step 0, on time
    grader.addOnset(600); // step 2, 100 ms late
    // step 3 (up) not played
    const results = grader.flush(1000);
    expect(results.map((r) => r.result)).toEqual(['hit', 'rest', 'late', 'miss']);
    expect(results[2].offsetMs).toBe(100);

    const stats = grader.getStats();
    expect(stats).toMatchObject({ strokes: 3, hits: 1, offBeat: 1, misses: 1, extras: 0 });
    expect(stats.accuracy).toBeCloseTo(0.5);
    expect(stats.meanOffsetMs).toBeCloseTo(55);
  });

  it('flags strums played on a rest', () => {
    const grader = new RhythmGrader(pattern, 120);
    grader.addOnset(0);
    grader.addOnset(240);
    const results = grader.flush(500);
    expect(results.map((r) => r.result)).toEqual(['hit', 'extra']);
    expect(grader.getStats().extras).toBe(1);
  });

  it('only finalises a step after its window closes', () => {
    const grader = new RhythmGrader(pattern, 120);
    expect(grader.flush(100)).toEqual([]);
    grader.addOnset(-20);
    expect(grader.flush(125).map((r) => r.result)).toEqual(['hit']);
    // Onsets for steps already judged are ignored.
    grader.addOnset(10);
    expect(grader.getStats().hits).toBe(1);
  });

  it('keeps the onset closest to the grid and loops the pattern', () => {
    const grader = new RhythmGrader(pattern, 120);
    grader.addOnset(1090); // step 4 = pattern index 0
    grader.addOnset(1005);
    const [, , , , step4] = grader.flush(1200);
    expect(step4).toMatchObject({ index: 0, stroke: 'down', result: 'hit', offsetMs: 5 });
  });

  it('tightens the windows for fast subdivisions', () => {
    const fast = new RhythmGrader(parsePattern('DUDUDUDUDUDUDUDU')!, 200); // 75 ms steps
    fast.addOnset(30); // on-time window shrinks to 22.5 ms
    expect(fast.flush(40)[0].result).toBe('late');
  });
});
