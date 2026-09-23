# ChordSet

Aplicativo para músicos: **cifras**, **repertórios (setlists)** e **afinador**, pensado para ensaios, cultos e apresentações. Funciona 100% offline; os dados ficam no aparelho.

- **Cifras** — biblioteca local com busca por título/artista, favoritas, transposição (maior/menor, sustenidos, bemóis, sétimas, baixo invertido), capo, tamanho de fonte, mostrar/esconder acordes, rolagem automática com velocidade ajustável e modo palco (toque na cifra para esconder os controles).
- **Formato** — parser próprio inspirado no [ChordPro](https://www.chordpro.org/) (`[G]Grande é o Senhor`, `{title: …}`, `{soc}`/`{eoc}` …). Também aceita cifras coladas no formato "acordes em cima da letra" e converte para ChordPro.
- **Repertórios** — músicas em ordem, com tom e capo específicos por repertório (sem alterar a biblioteca), reordenação e navegação anterior/próxima dentro da cifra.
- **Afinador** — cromático (12 notas, Hz, cents, indicador abaixo/afinado/acima) e violão (E2 A2 D3 G3 B3 E4, automático ou corda fixa). Captura PCM do microfone com `expo-audio` e detecta a frequência com o algoritmo **YIN** implementado em TypeScript, sem WebView e sem bibliotecas GPL. Referência A4 ajustável (padrão 440 Hz).
- **Tema escuro e claro**, botões grandes e layout limitado em largura para tablets/estantes de partitura.

## Tecnologias

| Área        | Tecnologia                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------- |
| Base        | React Native 0.86, Expo SDK 57, TypeScript 6 (strict)                                         |
| Navegação   | Expo Router 57 (abas + stack + modais)                                                        |
| Banco local | expo-sqlite (migrations via `PRAGMA user_version`) e `expo-sqlite/kv-store` para preferências |
| Áudio       | expo-audio (`useAudioStream` → PCM float32 do microfone)                                      |
| Outros      | expo-keep-awake (tela ligada na cifra), expo-crypto (UUIDs), @expo/vector-icons               |
| Qualidade   | ESLint 9 (`eslint-config-expo` + React Compiler rules), Prettier 3, Jest (`jest-expo`)        |
| Build       | Expo prebuild + Gradle (GitHub Actions) ou EAS Build                                          |

## Requisitos

- **Node.js 20.19.4+ ou 22.13+** (o CI usa Node 22) e npm 10+
- Para rodar em aparelho/emulador Android: **Android Studio** (SDK 36, build-tools 36.0.0, NDK 27.1) e **JDK 17**
- Opcional: conta Expo + [EAS CLI](https://docs.expo.dev/build/setup/) (`npm i -g eas-cli`) para builds na nuvem

## Instalação

```bash
git clone https://github.com/felipednegredo/ChordSet.git
cd ChordSet
npm install
```

## Executar

```bash
npx expo start          # ou: npm start
```

O projeto inclui `expo-dev-client`, então o fluxo recomendado é uma **development build** (tem todos os módulos nativos exatamente nas versões do projeto):

```bash
npm run android         # = expo run:android — compila, instala e abre no aparelho/emulador
npm start               # nas próximas vezes basta iniciar o servidor
```

Para testar rapidamente no **Expo Go** (SDK 57): `npm run start:go` e escaneie o QR code. Cifras e repertórios funcionam; para o afinador prefira a development build.

### Rodar no Android

1. Ative _Opções do desenvolvedor → Depuração USB_ no aparelho (ou abra um emulador no Android Studio).
2. Confira com `adb devices`.
3. `npm run android`.
4. Na primeira vez que abrir o afinador, permita o uso do microfone.

## Scripts

| Script                                                                 | O que faz                                                           |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `npm start` / `npm run start:go`                                       | Servidor de desenvolvimento (dev build / Expo Go)                   |
| `npm run android`                                                      | Build de desenvolvimento e execução no Android (`expo run:android`) |
| `npm run typecheck`                                                    | `tsc --noEmit`                                                      |
| `npm run lint` / `lint:fix`                                            | ESLint (zero warnings)                                              |
| `npm run format` / `format:check`                                      | Prettier                                                            |
| `npm test` / `test:ci`                                                 | Jest                                                                |
| `npm run validate`                                                     | typecheck + lint + prettier + testes (o mesmo que o CI)             |
| `npm run prebuild:android`                                             | Gera a pasta `android/` a partir do `app.json`                      |
| `npm run android:apk`                                                  | Prebuild + `./gradlew assembleRelease` (APK local)                  |
| `npm run android:apk:debug`                                            | Prebuild + `./gradlew assembleDebug`                                |
| `npm run eas:build:dev` / `eas:build:preview` / `eas:build:production` | EAS Build na nuvem                                                  |
| `npm run eas:build:local`                                              | EAS Build do perfil preview na sua máquina                          |

## Estrutura de pastas

```
app/                          # Rotas (Expo Router) — só reexportam telas de src/features
  _layout.tsx                 # Providers: settings, tema, SQLite (migrations), Stack
  (tabs)/_layout.tsx          # Abas: Cifras | Repertórios | Afinador
  (tabs)/index.tsx            # Biblioteca de cifras
  (tabs)/repertoires.tsx
  (tabs)/tuner.tsx
  song/[id].tsx               # Visualização (param opcional entryId = modo repertório)
  song/new.tsx, song/edit.tsx, song/add-to-repertoire.tsx
  repertoire/[id].tsx         # Repertório
  repertoire/new.tsx, edit.tsx, add-songs.tsx, entry.tsx (tom/capo da música no repertório)
  settings.tsx
src/
  components/                 # UI reutilizável (AppText, Button, Chip, Stepper, KeyPicker, …)
  database/                   # migrations.ts, migrate.ts, rows.ts (mappers), seed.ts, useRepositories.ts
  features/
    chords/                   # Lógica pura: chord.ts, notes.ts, transpose.ts, keys.ts, parser.ts, sheet.ts
    songs/                    # songRepository, validação, playback (tom/capo), hooks, componentes, telas
    repertoires/              # repertoireRepository, reorder, componentes, telas
    tuner/                    # yin.ts, frequency.ts, notes.ts, pcm.ts, analyzer.ts, guitar.ts, useTuner.ts
    settings/                 # preferências (tema, fonte, rolagem, A4)
  hooks/                      # useAsyncResource, useDebouncedValue
  services/                   # erros, datas, ids, normalização de texto
  theme/                      # cores (claro/escuro), tokens, ThemeProvider
  types/                      # modelos de domínio e contratos dos repositories
plugins/withAndroidReleaseSigning.js   # config plugin: assinatura release opcional via env
.github/workflows/android-build.yml    # CI: checks + APK
eas.json                               # perfis development / preview / production
```

### Decisões principais

- **Regras de negócio sem UI**: transposição, parser e toda a cadeia do afinador (`PCM → YIN → Hz → nota → cents`) são TypeScript puro e testados com Jest.
- **Repositories**: as telas usam `useRepositories()` (interfaces em `src/types/repositories.ts`). Trocar SQLite por uma implementação sincronizada com a nuvem não exige mudar telas.
- **Tom no repertório**: `repertoire_songs.key`/`capo` são `NULL` quando seguem a biblioteca. Mudar o tom dentro de um repertório só grava na entrada do repertório.
- **Capo**: o tom atual é o tom que **soa**; com capo, os acordes exibidos são as formas (ex.: soa em B com capo 2 → formas em A).
- **IDs UUID** e `created_at`/`updated_at` em ISO-8601 para facilitar sincronização futura.
- **Continuous Native Generation**: `android/` não é versionado; é gerado por `expo prebuild` a partir do `app.json` e dos config plugins.

### Banco de dados

| Tabela             | Campos                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `songs`            | id, title, artist, original_key, current_key, capo, content, favorite, created_at, updated_at |
| `repertoires`      | id, name, date, created_at, updated_at                                                        |
| `repertoire_songs` | id, repertoire_id → repertoires (cascade), song_id → songs (cascade), position, key, capo     |

Para alterar o schema, **adicione** uma nova migration em `src/database/migrations.ts` com a próxima versão (nunca edite uma já publicada).

## Gerar APK

### Opção 1 — GitHub Actions (recomendado, sem secrets)

1. Faça push para o GitHub.
2. Abra **Actions → Android Build → Run workflow** (método `gradle`, tipo `release`).
3. Ao terminar, baixe o APK em **Artifacts → `chordset-android-apk`** no final da página da execução.

O workflow também roda em todo push na `main` e em tags `v*` (nas tags o APK também é anexado à _Release_ do GitHub).

### Opção 2 — Gradle local (sem EAS)

Requer Android SDK + JDK 17 configurados (`ANDROID_HOME`).

```bash
npm run android:apk
# APK: android/app/build/outputs/apk/release/app-release.apk
adb install android/app/build/outputs/apk/release/app-release.apk
```

Sem keystore configurada, o APK release é assinado com a **chave de debug** — instalável para testes, mas não serve para a Play Store.

### Opção 3 — EAS Build

```bash
npx eas-cli login
npx eas-cli init                # uma vez: vincula o projeto e grava o projectId no app.json (commite)
npm run eas:build:preview       # APK instalável para testes (link de download ao final)
```

Perfis em `eas.json`:

| Perfil        | Saída                                            | Uso                             |
| ------------- | ------------------------------------------------ | ------------------------------- |
| `development` | APK debug com dev client                         | desenvolvimento com `npm start` |
| `preview`     | **APK** release, distribuição interna            | testes/instalação direta        |
| `production`  | AAB (app bundle), `autoIncrement` do versionCode | Google Play                     |

## Build de produção

- **Play Store (recomendado)**: `npm run eas:build:production` gera um `.aab`; o EAS gerencia a chave de assinatura. Envie com `npx eas-cli submit -p android`.
- **APK assinado com sua chave (Gradle/CI)**: crie uma keystore uma vez e configure os secrets abaixo; o plugin `plugins/withAndroidReleaseSigning.js` passa a usá-la automaticamente no `assembleRelease`.

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore chordset-upload.keystore \
  -alias chordset -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 chordset-upload.keystore > keystore.base64.txt   # conteúdo do secret ANDROID_KEYSTORE_BASE64
```

Guarde a keystore e as senhas fora do repositório (`*.keystore`/`*.jks` estão no `.gitignore`).

Antes de publicar, atualize `expo.version` e `expo.android.versionCode` no `app.json` (ou use `autoIncrement` no EAS) e troque o pacote `com.chordset.app` se necessário.

## GitHub Actions

Arquivo: `.github/workflows/android-build.yml`

| Gatilho                      | O que acontece                                                             |
| ---------------------------- | -------------------------------------------------------------------------- |
| `workflow_dispatch` (manual) | escolha `method` (`gradle`/`eas`), `build_type` (`release`/`debug`) e ABIs |
| push na `main`               | checks + APK release via Gradle                                            |
| tag `v*`                     | checks + APK release + anexo na GitHub Release                             |

Jobs:

1. **checks** — `npm ci`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test:ci`.
2. **build-gradle** — Node 22 (cache npm), JDK 17 Temurin, Android SDK (lê `compileSdk`, `buildTools` e `ndkVersion` de `node_modules/react-native/gradle/libs.versions.toml` para ficar sempre em sincronia), cache do Gradle, `npm run prebuild:android`, `./gradlew assembleRelease` (ABIs `armeabi-v7a,arm64-v8a` por padrão para acelerar), e upload do APK.
   - **Local do APK no runner**: `android/app/build/outputs/apk/<release|debug>/app-<release|debug>.apk`
   - **Artifact**: `chordset-android-apk` → `ChordSet-<versão>-<tipo>-<sha>.apk` (retido por 30 dias)
3. **build-eas** (só manual com `method = eas`) — `eas build --profile preview --wait`, baixa o APK e publica como artifact `chordset-android-apk-eas`.

### Secrets e variáveis

Configure em **GitHub → Settings → Secrets and variables → Actions → New repository secret**. Nunca coloque tokens no código.

| Secret                      | Obrigatório?           | Uso                                                                         |
| --------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| `EXPO_TOKEN`                | só para `method = eas` | Token de acesso da Expo (expo.dev → Account settings → Access tokens)       |
| `ANDROID_KEYSTORE_BASE64`   | opcional               | Keystore de upload em base64; sem ele o APK é assinado com a chave de debug |
| `ANDROID_KEYSTORE_PASSWORD` | com a keystore         | Senha da keystore                                                           |
| `ANDROID_KEY_ALIAS`         | com a keystore         | Alias da chave (ex.: `chordset`)                                            |
| `ANDROID_KEY_PASSWORD`      | com a keystore         | Senha da chave                                                              |

Não há variáveis de ambiente necessárias para rodar o app: não existe backend nesta versão.

## Testes

```bash
npm test
```

Cobrem transposição de acordes, parser ChordPro (inclusive "acordes em cima da letra"), frequência ↔ nota, cents, YIN (senoides e tons com harmônicos, silêncio e ruído), pipeline de streaming do analisador, lógica de tom/capo, validação e utilitários.

## Limitações conhecidas

- O afinador depende do `useAudioStream` do expo-audio (SDK 57). Em ambientes muito ruidosos a detecção automática de corda pode oscilar; use a corda fixa.
- Reordenação de músicas no repertório usa botões ↑/↓ (sem arrastar-e-soltar).
- Importação de arquivos `.cho`/`.chopro` ainda não tem tela (o parser e `toChordPro` já suportam).
- Sem backup/sincronização: desinstalar o app apaga os dados.
- iOS está preparado (bundle id, permissão de microfone), mas não foi testado nesta versão.

## Próximos passos

- Importar/exportar arquivos ChordPro e backup do banco (`serializeAsync`).
- Login, sincronização na nuvem e compartilhamento de repertórios (novas implementações dos repositories).
- Equipes/bandas, metrônomo e diagramas de acordes.
- Arrastar-e-soltar no repertório e modo apresentação com pedal Bluetooth (page turner).
