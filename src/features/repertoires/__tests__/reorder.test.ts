import { moveItem } from '../reorder';

describe('moveItem', () => {
  it('moves items up and down', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 2, 1)).toEqual(['a', 'c', 'b', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 3)).toEqual(['b', 'c', 'd', 'a']);
  });

  it('ignores out-of-range moves without mutating the input', () => {
    const input = ['a', 'b'];
    expect(moveItem(input, 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(input, 1, 2)).toEqual(['a', 'b']);
    expect(input).toEqual(['a', 'b']);
  });
});
