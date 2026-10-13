import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, TextField } from '../../../components';
import { logError, toUserMessage } from '../../../services/errors';
import { radius, spacing, useTheme } from '../../../theme';
import { type ImportedSong, importSongFromUrl } from '../webImport';

export interface WebImportCardProps {
  onImported: (song: ImportedSong) => void;
}

/** Link field that downloads a cifra (Cifra Club or any site with the cifra in plain text). */
export function WebImportCard({ onImported }: WebImportCardProps) {
  const { colors } = useTheme();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const submit = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const song = await importSongFromUrl(url);
      onImported(song);
      setUrl('');
    } catch (err) {
      logError('importSongFromUrl', err);
      setError(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TextField
        label="Importar de um site"
        value={url}
        onChangeText={(text) => {
          setUrl(text);
          setError(undefined);
        }}
        error={error}
        placeholder="https://www.cifraclub.com.br/artista/musica/"
        hint="Cole o link da página da música. A cifra fica salva no aparelho e funciona offline."
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        returnKeyType="go"
        onSubmitEditing={() => url.trim() && !loading && void submit()}
      />
      <Button
        label="Importar cifra"
        icon="cloud-download-outline"
        variant="secondary"
        loading={loading}
        disabled={!url.trim()}
        onPress={submit}
      />
      <AppText variant="caption" color="textSubtle">
        Use só para uso pessoal e respeite os termos do site de origem.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1 },
});
