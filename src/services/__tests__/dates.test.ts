import { formatIsoDate, nextSunday, parseBrazilianDate, toIsoDate } from '../dates';
import { normalizeForSearch } from '../text';

describe('dates', () => {
  it('parses and formats Brazilian dates', () => {
    expect(parseBrazilianDate('27/09/2026')).toBe('2026-09-27');
    expect(parseBrazilianDate('1/2/26')).toBe('2026-02-01');
    expect(parseBrazilianDate('31/02/2026')).toBeNull();
    expect(parseBrazilianDate('abc')).toBeNull();
    expect(formatIsoDate('2026-09-27')).toBe('27/09/2026');
    expect(formatIsoDate(null)).toBe('');
  });

  it('finds the next Sunday', () => {
    expect(toIsoDate(nextSunday(new Date(2026, 8, 23)))).toBe('2026-09-27');
    expect(toIsoDate(nextSunday(new Date(2026, 8, 27)))).toBe('2026-09-27');
  });
});

describe('normalizeForSearch', () => {
  it('ignores accents and case', () => {
    expect(normalizeForSearch('  Coração É Teu ')).toBe('coracao e teu');
  });
});
