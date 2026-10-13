import { AppError } from '../../services/errors';
import { clampCapo, isChordLine, isValidKey, parseChord } from '../chords';

/**
 * Imports a chord sheet from a web page (Cifra Club, Cifras, or any site that
 * shows the cifra inside a <pre> block). The page is downloaded once; the song
 * is then stored locally and works offline like any other.
 *
 * Parsing is pure TypeScript (no DOM in React Native) so it is unit tested
 * with HTML fixtures.
 */

export interface ImportedSong {
  title: string;
  artist: string;
  /** Key in which the cifra is written, when the page states it or it can be guessed. */
  key: string | null;
  capo: number;
  /** Chords-over-lyrics text, with tablatures wrapped in {sot}/{eot}. */
  content: string;
  sourceUrl: string;
}

/** Larger pages are not chord sheets (and could exhaust memory on old phones). */
const MAX_HTML_LENGTH = 3_000_000;
const TIMEOUT_MS = 15_000;

export class ImportError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'network', cause);
    this.name = 'ImportError';
  }
}

/** Accepts "cifraclub.com.br/artista/musica" or a full URL. Returns null when it is not http(s). */
export function normalizeImportUrl(input: string): string | null {
  let text = input.trim();
  // Links shared from a browser often come with the page title before the URL.
  const embedded = /https?:\/\/\S+/i.exec(text);
  if (embedded) text = embedded[0];
  if (!text) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = `https://${text}`;
  const match = /^(https?):\/\/([^/?#\s]+)([^\s]*)$/i.exec(text);
  if (!match || !match[2].includes('.')) return null;
  return `${match[1].toLowerCase()}://${match[2].toLowerCase()}${match[3]}`;
}

export function hostOf(url: string): string {
  return (/^https?:\/\/([^/?#:]+)/i.exec(url)?.[1] ?? '').toLowerCase().replace(/^(www|m)\./, '');
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  ordm: 'º',
  ordf: 'ª',
  deg: '°',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
  });
}

/** Removes tags but keeps the text columns intact (important for chords over lyrics). */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/ /g, ' ')
    .replace(/\r\n?/g, '\n');
}

function inlineText(html: string | undefined): string {
  return html ? htmlToText(html).replace(/\s+/g, ' ').trim() : '';
}

/** Inner HTML of the first element whose opening tag matches `openTag`. */
function firstElement(html: string, tag: string, attributePattern: RegExp): string | undefined {
  const pattern = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)</${tag}>`, 'gi');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    if (attributePattern.test(match[1])) return match[2];
  }
  return undefined;
}

function metaContent(html: string, property: string): string {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
    'i',
  );
  const match = pattern.exec(html);
  return decodeEntities(match?.[1] ?? match?.[2] ?? '').trim();
}

/** The <pre> with the most text: on chord sites that is the cifra. */
function largestPre(html: string): string | null {
  let best: string | null = null;
  for (const match of html.matchAll(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi)) {
    const text = htmlToText(match[1]);
    if (!best || text.trim().length > best.trim().length) best = text;
  }
  return best;
}

const TAB_LINE = /^\s*[A-Ga-g][#b]?\s*\|.*[-|]/;
/** Cifra Club splits long tablatures in "Parte 1 de 4" blocks. */
const TAB_PART_LINE = /^\s*parte\s+\d+\s+de\s+\d+\s*$/i;

/**
 * Cleans the cifra text: trims blank edges, removes trailing spaces and wraps
 * runs of tablature lines (E|---3---|) so they are shown in a monospace block.
 */
export function cleanSheetText(text: string): string {
  const lines = text
    .split('\n')
    .map((line) => line.replace(/\t/g, '    ').replace(/\s+$/, ''))
    .filter((line) => !TAB_PART_LINE.test(line));
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

  const out: string[] = [];
  let inTab = false;
  for (const line of lines) {
    const isTab = TAB_LINE.test(line);
    if (isTab && !inTab) out.push('{start_of_tab}');
    if (!isTab && inTab) out.push('{end_of_tab}');
    inTab = isTab;
    out.push(line);
  }
  if (inTab) out.push('{end_of_tab}');
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

/** First chord of the cifra; a good guess for the key when the page does not say it. */
export function guessKey(content: string): string | null {
  for (const line of content.split('\n')) {
    if (!isChordLine(line)) continue;
    for (const token of line.trim().split(/\s+/)) {
      const chord = parseChord(token);
      if (!chord) continue;
      const key = `${chord.root}${/^m(?!aj)/.test(chord.quality) ? 'm' : ''}`;
      if (isValidKey(key)) return key;
    }
  }
  return null;
}

/** "Tempo Perdido - Legião Urbana - Cifra Club" → title and artist. */
function splitPageTitle(pageTitle: string): { title: string; artist: string } {
  const parts = pageTitle
    .replace(/\((?:cifra|cifras?|tab|letra|acordes|chords)[^)]*\)/gi, '')
    .split(/\s+[-–|]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 3) parts.pop(); // site name
  return { title: parts[0] ?? '', artist: parts[1] ?? '' };
}

function findKey(html: string, text: string): string | null {
  const tom = firstElement(html, 'span', /id=["']cifra_tom["']/i);
  const candidates = [inlineText(tom), text];
  for (const candidate of candidates) {
    const match = /\btom\s*:\s*([A-G][#b]?m?)(?![a-z#])/i.exec(candidate);
    if (match) {
      const key = match[1][0].toUpperCase() + match[1].slice(1);
      if (isValidKey(key)) return key;
    }
  }
  return null;
}

function findCapo(html: string, text: string): number {
  const capo = firstElement(html, 'span', /id=["']cifra_capo["']/i);
  const match = /capo(?:traste)?[^0-9\n]{0,20}(\d{1,2})/i.exec(inlineText(capo) || text);
  return match ? clampCapo(Number(match[1])) : 0;
}

/** Extracts the song from the page HTML. Throws {@link ImportError} when there is no cifra. */
export function parseSongPage(html: string, url: string): ImportedSong {
  const pre = largestPre(html);
  if (!pre || !pre.trim()) {
    throw new ImportError(
      'Não encontrei uma cifra nesta página. Abra a página da música (não a do artista) ou copie e cole o texto.',
    );
  }
  const content = cleanSheetText(pre);

  // Cifra Club: <h1 class="t1">Title</h1> <h2 class="t3"><a>Artist</a></h2>
  let title = inlineText(firstElement(html, 'h1', /class=["'][^"']*\bt1\b/i));
  let artist = inlineText(firstElement(html, 'h2', /class=["'][^"']*\bt3\b/i));
  if (!title || !artist) {
    const fromTitle = splitPageTitle(
      metaContent(html, 'og:title') || inlineText(firstElement(html, 'title', /.*/)),
    );
    title ||= fromTitle.title || inlineText(firstElement(html, 'h1', /.*/));
    artist ||= fromTitle.artist;
  }

  const pageText = inlineText(
    html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<pre\b[\s\S]*?<\/pre>/gi, ' '),
  );
  return {
    title,
    artist,
    key: findKey(html, pageText) ?? guessKey(content),
    capo: findCapo(html, pageText),
    content,
    sourceUrl: url,
  };
}

/** Downloads and parses a song page. */
export async function importSongFromUrl(
  input: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ImportedSong> {
  const url = normalizeImportUrl(input);
  if (!url) throw new ImportError('Endereço inválido. Cole o link da página da cifra.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let html: string;
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'pt-BR,pt;q=0.9' },
    });
    if (!response.ok) {
      throw new ImportError(
        response.status === 404
          ? 'Página não encontrada. Confira o link.'
          : `O site respondeu com erro (${response.status}). Tente novamente mais tarde.`,
      );
    }
    html = await response.text();
  } catch (error) {
    if (error instanceof ImportError) throw error;
    throw new ImportError('Não foi possível baixar a página. Verifique sua conexão com a internet.', error);
  } finally {
    clearTimeout(timer);
  }

  if (html.length > MAX_HTML_LENGTH) throw new ImportError('A página é grande demais para ser uma cifra.');
  return parseSongPage(html, url);
}
