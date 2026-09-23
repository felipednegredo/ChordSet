import { clampCapo, isValidKey } from '../chords';
import { ValidationError } from '../../services/errors';
import type { SongInput } from '../../types';

export const TITLE_MAX_LENGTH = 120;
export const ARTIST_MAX_LENGTH = 120;

export type SongFormErrors = Partial<
  Record<'title' | 'artist' | 'originalKey' | 'currentKey' | 'content', string>
>;

/** Returns field errors for a song form (empty object when valid). */
export function getSongFormErrors(input: SongInput): SongFormErrors {
  const errors: SongFormErrors = {};
  const title = input.title.trim();
  if (!title) errors.title = 'Informe o título.';
  else if (title.length > TITLE_MAX_LENGTH) errors.title = `Máximo de ${TITLE_MAX_LENGTH} caracteres.`;
  if (input.artist.trim().length > ARTIST_MAX_LENGTH)
    errors.artist = `Máximo de ${ARTIST_MAX_LENGTH} caracteres.`;
  if (!isValidKey(input.originalKey)) errors.originalKey = 'Selecione o tom original.';
  if (!isValidKey(input.currentKey)) errors.currentKey = 'Selecione o tom atual.';
  if (!input.content.trim()) errors.content = 'Cole ou escreva a cifra.';
  return errors;
}

/** Normalises a song input and throws a {@link ValidationError} when invalid. */
export function validateSongInput(input: SongInput): Required<SongInput> {
  const errors = getSongFormErrors(input);
  const first = Object.values(errors)[0];
  if (first) throw new ValidationError(first);
  return {
    title: input.title.trim(),
    artist: input.artist.trim(),
    originalKey: input.originalKey.trim(),
    currentKey: input.currentKey.trim(),
    capo: clampCapo(input.capo),
    content: input.content.replace(/\r\n?/g, '\n'),
    favorite: input.favorite ?? false,
  };
}
