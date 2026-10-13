import { parseChordSheet } from '../../chords';
import {
  cleanSheetText,
  decodeEntities,
  guessKey,
  hostOf,
  ImportError,
  importSongFromUrl,
  normalizeImportUrl,
  parseSongPage,
} from '../webImport';

const CIFRA_CLUB_PAGE = `<!DOCTYPE html>
<html lang="pt-BR"><head>
<title>Tempo Perdido - Legião Urbana - Cifra Club</title>
<meta property="og:title" content="Tempo Perdido - Legião Urbana - Cifra Club">
<script>var tom = "tom: X";</script>
</head><body>
<div class="g-1 g-fix cifra">
  <h1 class="t1">Tempo Perdido</h1>
  <h2 class="t3"><a href="/legiao-urbana/">Legião Urbana</a></h2>
  <div class="cifra_cnt">
    <span id="cifra_tom">tom: <a class="js-modal-trigger" href="#" title="alterar o tom">C</a></span>
    <span id="cifra_capo">Capotraste na 2ª casa</span>
    <pre>[Intro] <b>C</b>  <b>Am</b>

Parte 1 de 2
<span class="tablatura"><span class="cnt">E|-----------------|
B|---1-----1-------|</span></span>

<b>C</b>             <b>Am</b>
  Todos os dias quando acordo
     <b>F</b>         <b>G</b>
Não tenho mais o tempo que passou
&nbsp;
[Refr&atilde;o]
<b>Dm7(9)</b>  <b>G7/B</b>
Somos tão jovens</pre>
  </div>
</div>
<pre>x</pre>
</body></html>`;

describe('normalizeImportUrl', () => {
  it.each([
    [
      'https://www.cifraclub.com.br/legiao-urbana/tempo-perdido/',
      'https://www.cifraclub.com.br/legiao-urbana/tempo-perdido/',
    ],
    ['cifraclub.com.br/legiao-urbana/tempo-perdido', 'https://cifraclub.com.br/legiao-urbana/tempo-perdido'],
    ['  HTTPS://M.CifraClub.com.br/a/b  ', 'https://m.cifraclub.com.br/a/b'],
    ['Tempo Perdido - Cifra Club https://www.cifraclub.com.br/x/y/', 'https://www.cifraclub.com.br/x/y/'],
  ])('%s', (input, expected) => {
    expect(normalizeImportUrl(input)).toBe(expected);
  });

  it.each(['', 'tempo perdido', 'ftp://site.com/a', 'javascript:alert(1)'])('rejects %p', (input) => {
    expect(normalizeImportUrl(input)).toBeNull();
  });

  it('extracts the host', () => {
    expect(hostOf('https://m.cifraclub.com.br/a')).toBe('cifraclub.com.br');
  });
});

describe('decodeEntities', () => {
  it('decodes named and numeric entities', () => {
    expect(decodeEntities('Refr&atilde;o &amp; &#233; &#xE7; &lt;b&gt;')).toBe('Refr&atilde;o & é ç <b>');
  });
});

describe('parseSongPage (Cifra Club)', () => {
  const song = parseSongPage(CIFRA_CLUB_PAGE, 'https://www.cifraclub.com.br/legiao-urbana/tempo-perdido/');

  it('reads title, artist, key and capo', () => {
    expect(song.title).toBe('Tempo Perdido');
    expect(song.artist).toBe('Legião Urbana');
    expect(song.key).toBe('C');
    expect(song.capo).toBe(2);
  });

  it('keeps chords aligned over the lyrics', () => {
    const lines = song.content.split('\n');
    const chordLine = lines.indexOf('C             Am');
    expect(chordLine).toBeGreaterThan(-1);
    expect(lines[chordLine + 1]).toBe('  Todos os dias quando acordo');
  });

  it('wraps tablatures and produces a sheet the viewer understands', () => {
    expect(song.content).toContain(
      '{start_of_tab}\nE|-----------------|\nB|---1-----1-------|\n{end_of_tab}',
    );
    const sheet = parseChordSheet(song.content);
    const kinds = sheet.sections.map((section) => section.kind);
    expect(kinds).toContain('tab');
    const lyricLines = sheet.sections.flatMap((s) => s.lines).filter((line) => line.kind === 'lyrics');
    expect(lyricLines[0]).toMatchObject({ kind: 'lyrics' });
    const first = lyricLines[0].kind === 'lyrics' ? lyricLines[0].segments : [];
    expect(first.map((segment) => segment.chord)).toEqual(expect.arrayContaining(['C', 'Am']));
    expect(first.map((segment) => segment.lyrics).join('')).toContain('Todos os dias quando acordo');
    expect(song.content).not.toContain('Parte 1 de 2');
  });
});

describe('parseSongPage (generic sites)', () => {
  it('falls back to the page title and to the first chord for the key', () => {
    const html = `<html><head><title>Asa Branca - Luiz Gonzaga (Cifra) | Cifras</title></head>
      <body><pre>
Am        Dm
Quando olhei a terra ardendo
</pre></body></html>`;
    const song = parseSongPage(html, 'https://www.cifras.com.br/x');
    expect(song).toMatchObject({ title: 'Asa Branca', artist: 'Luiz Gonzaga', key: 'Am', capo: 0 });
  });

  it('reads "Tom: G" written in the page', () => {
    const html = '<h1>Música</h1><p>Tom: G</p><pre>G  D\nla la</pre>';
    expect(parseSongPage(html, 'https://site.com/a').key).toBe('G');
  });

  it('fails with a helpful message when there is no cifra', () => {
    expect(() => parseSongPage('<html><body><p>Artista</p></body></html>', 'https://a.com')).toThrow(
      ImportError,
    );
  });
});

describe('cleanSheetText / guessKey', () => {
  it('trims blank edges and collapses big gaps', () => {
    expect(cleanSheetText('\n\n  \nG\nla\n\n\n\nD\nlo   \n\n')).toBe('G\nla\n\nD\nlo');
  });

  it('guesses minor keys and skips labels', () => {
    expect(guessKey('[Intro] x\nF#m7  D\nletra')).toBe('F#m');
    expect(guessKey('só letra')).toBeNull();
  });
});

describe('importSongFromUrl', () => {
  const response = (body: string, status = 200) =>
    ({ ok: status >= 200 && status < 300, status, text: async () => body }) as Response;

  it('downloads and parses the page', async () => {
    const fetchMock = jest.fn().mockResolvedValue(response(CIFRA_CLUB_PAGE));
    const song = await importSongFromUrl('cifraclub.com.br/legiao-urbana/tempo-perdido/', fetchMock);
    expect(fetchMock.mock.calls[0][0]).toBe('https://cifraclub.com.br/legiao-urbana/tempo-perdido/');
    expect(song.title).toBe('Tempo Perdido');
  });

  it('reports HTTP and network errors', async () => {
    await expect(
      importSongFromUrl('a.com/x', jest.fn().mockResolvedValue(response('', 404))),
    ).rejects.toThrow('Página não encontrada');
    await expect(
      importSongFromUrl('a.com/x', jest.fn().mockRejectedValue(new TypeError('offline'))),
    ).rejects.toThrow('Verifique sua conexão');
    await expect(importSongFromUrl('não é link')).rejects.toThrow('Endereço inválido');
  });
});
