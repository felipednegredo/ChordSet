import { isChordLine, normalizeToChordPro, parseChordSheet, parseInlineChords } from '../parser';
import { toDisplayWords, transposeSheet } from '../sheet';

const SAMPLE = `{title: Grande é o Senhor}
{artist: Exemplo}
{key: G}
{capo: 2}

[G]Grande é o Senhor
[C]Digno de louvor
[Em]Na cidade do nosso Deus
[D]Seu santo monte`;

describe('parseInlineChords', () => {
  it('separates chords from lyrics', () => {
    expect(parseInlineChords('[G]Grande é o [C]Senhor')).toEqual([
      { chord: 'G', lyrics: 'Grande é o ' },
      { chord: 'C', lyrics: 'Senhor' },
    ]);
  });

  it('keeps lyrics before the first chord', () => {
    expect(parseInlineChords('Oh [Am]vem')).toEqual([
      { chord: null, lyrics: 'Oh ' },
      { chord: 'Am', lyrics: 'vem' },
    ]);
  });

  it('handles consecutive chords and chords at the end', () => {
    expect(parseInlineChords('[G][D/F#]fim[C]')).toEqual([
      { chord: 'G', lyrics: '' },
      { chord: 'D/F#', lyrics: 'fim' },
      { chord: 'C', lyrics: '' },
    ]);
  });
});

describe('parseChordSheet', () => {
  it('reads ChordPro metadata directives', () => {
    const sheet = parseChordSheet(SAMPLE);
    expect(sheet.metadata).toEqual({
      title: 'Grande é o Senhor',
      artist: 'Exemplo',
      key: 'G',
      capo: 2,
      extra: {},
    });
  });

  it('produces lyric lines with chord segments', () => {
    const sheet = parseChordSheet(SAMPLE);
    const lines = sheet.sections[0].lines.filter((line) => line.kind === 'lyrics');
    expect(lines).toHaveLength(4);
    expect(lines[0]).toEqual({ kind: 'lyrics', segments: [{ chord: 'G', lyrics: 'Grande é o Senhor' }] });
    expect(lines[2]).toEqual({
      kind: 'lyrics',
      segments: [{ chord: 'Em', lyrics: 'Na cidade do nosso Deus' }],
    });
  });

  it('drops blank lines at the start and end of sections', () => {
    const sheet = parseChordSheet('{title: X}\n\n\n{sov}\n\n[G]a\n\n[C]b\n\n{eov}\n\n');
    expect(sheet.sections).toEqual([
      {
        kind: 'verse',
        label: null,
        lines: [
          { kind: 'lyrics', segments: [{ chord: 'G', lyrics: 'a' }] },
          { kind: 'empty' },
          { kind: 'lyrics', segments: [{ chord: 'C', lyrics: 'b' }] },
        ],
      },
    ]);
  });

  it('creates sections from start/end directives', () => {
    const sheet = parseChordSheet('[C]verso\n{soc}\n[F]refrão\n{eoc}\n{sot}\ne|---0---|\n{eot}');
    expect(sheet.sections.map((s) => s.kind)).toEqual(['default', 'chorus', 'tab']);
    expect(sheet.sections[1].label).toBe('Refrão');
    expect(sheet.sections[2].lines).toEqual([{ kind: 'tab', text: 'e|---0---|' }]);
  });

  it('parses comments, labels and ignores # lines', () => {
    const sheet = parseChordSheet('{c: Suave}\n# nota interna\n[Refrão]\n[Intro] G  D  Em');
    expect(sheet.sections[0].lines).toEqual([
      { kind: 'comment', text: 'Suave' },
      { kind: 'label', text: 'Refrão' },
      { kind: 'label', text: 'Intro' },
      {
        kind: 'chords',
        chords: [
          { chord: 'G', column: 0 },
          { chord: 'D', column: 3 },
          { chord: 'Em', column: 6 },
        ],
      },
    ]);
  });

  it('merges plain chords written above the lyrics', () => {
    const sheet = parseChordSheet('G          C\nGrande é o Senhor');
    expect(sheet.sections[0].lines[0]).toEqual({
      kind: 'lyrics',
      segments: [
        { chord: 'G', lyrics: 'Grande é o ' },
        { chord: 'C', lyrics: 'Senhor' },
      ],
    });
  });

  it('keeps chord-only lines when no lyrics follow', () => {
    const sheet = parseChordSheet('G  D  | Em  C (2x)\n\nLetra');
    expect(sheet.sections[0].lines[0]).toEqual({
      kind: 'chords',
      chords: [
        { chord: 'G', column: 0 },
        { chord: 'D', column: 3 },
        { chord: 'Em', column: 8 },
        { chord: 'C', column: 12 },
      ],
    });
  });
});

describe('isChordLine', () => {
  it('detects chord-only lines', () => {
    expect(isChordLine('G  D/F#  Em7  C9')).toBe(true);
    expect(isChordLine('Am  |  F  |  C  G  (2x)')).toBe(true);
  });

  it('rejects lyrics', () => {
    expect(isChordLine('Grande é o Senhor')).toBe(false);
    expect(isChordLine('A casa é sua')).toBe(false);
    expect(isChordLine('')).toBe(false);
  });
});

describe('transposeSheet', () => {
  it('transposes every chord without touching lyrics', () => {
    const sheet = transposeSheet(parseChordSheet('[G]Grande [D/F#]é\nC  Em\n'), 2);
    expect(sheet.sections[0].lines[0]).toEqual({
      kind: 'lyrics',
      segments: [
        { chord: 'A', lyrics: 'Grande ' },
        { chord: 'E/G#', lyrics: 'é' },
      ],
    });
    expect(sheet.sections[0].lines[1]).toEqual({
      kind: 'chords',
      chords: [
        { chord: 'D', column: 0 },
        { chord: 'F#m', column: 3 },
      ],
    });
  });
});

describe('toDisplayWords', () => {
  it('groups syllables of the same word and splits on spaces', () => {
    const words = toDisplayWords(parseInlineChords('[G]Gran[D]de é'));
    expect(words).toEqual([
      [
        { chord: 'G', text: 'Gran' },
        { chord: 'D', text: 'de ' },
      ],
      [{ chord: null, text: 'é' }],
    ]);
  });
});

describe('toDisplayWords with chords on spaces', () => {
  it('moves a chord placed on a space to the following word', () => {
    const words = toDisplayWords([
      { chord: 'C', lyrics: 'em cima' },
      { chord: 'G', lyrics: ' da' },
    ]);
    expect(words).toEqual([
      [{ chord: 'C', text: 'em ' }],
      [{ chord: null, text: 'cima ' }],
      [{ chord: 'G', text: 'da' }],
    ]);
  });
});

describe('normalizeToChordPro', () => {
  it('converts chords-over-lyrics to inline ChordPro', () => {
    expect(normalizeToChordPro('{title: Teste}\nG          C\nGrande é o Senhor')).toBe(
      '{title: Teste}\n[G]Grande é o [C]Senhor',
    );
  });

  it('round-trips inline ChordPro', () => {
    const source = '[G]Grande é o Senhor\n{start_of_chorus}\n[C]Digno\n{end_of_chorus}';
    expect(normalizeToChordPro(source)).toBe(source);
  });
});
