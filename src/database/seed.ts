import type { SongInput } from '../types';

/**
 * Example songs inserted on first launch so the app is not empty.
 * Only public-domain lyrics or original demo text are used here.
 */
export const SEED_SONGS: SongInput[] = [
  {
    title: 'Amazing Grace',
    artist: 'John Newton (domínio público)',
    originalKey: 'G',
    currentKey: 'G',
    capo: 0,
    favorite: true,
    content: `{title: Amazing Grace}
{artist: John Newton}
{key: G}

{start_of_verse: Verso 1}
A[G]mazing [G7]grace, how [C]sweet the [G]sound
That [G]saved a [Em]wretch like [D]me
I [G]once was [G7]lost, but [C]now am [G]found
Was [Em]blind, but [D]now I [G]see
{end_of_verse}

{start_of_verse: Verso 2}
'Twas [G]grace that [G7]taught my [C]heart to [G]fear
And [G]grace my [Em]fears re[D]lieved
How [G]precious [G7]did that [C]grace ap[G]pear
The [Em]hour I [D]first be[G]lieved
{end_of_verse}`,
  },
  {
    title: 'Guia rápido do ChordSet',
    artist: 'ChordSet',
    originalKey: 'C',
    currentKey: 'C',
    capo: 0,
    favorite: false,
    content: `{title: Guia rápido do ChordSet}
{comment: Acordes entre colchetes ficam acima da letra}

[Intro] C  G/B  Am7  F7M

{start_of_verse}
[C]Escreva o acorde [G/B]antes da sílaba
[Am7]onde ele entra na [F7M]música
[Dm7]Use os botões de [G7]tom para trans[C]por
{end_of_verse}

{start_of_chorus}
[F]Menores, [Fm]sustenidos e [C/E]baixos invertidos
[A7]Tudo é trans[Dm]posto automati[G7(4)]camente
{end_of_chorus}

# Linhas começando com # são ignoradas.
# Também é possível colar cifras com acordes em cima da letra:

C              G
Acordes em cima da letra
Am             F
funcionam também
`,
  },
];
