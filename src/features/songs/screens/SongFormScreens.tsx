import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { Button, EmptyState, ErrorState, LoadingView } from '../../../components';
import { useRepositories } from '../../../database/useRepositories';
import { useAsyncResource } from '../../../hooks/useAsyncResource';
import { logError, toUserMessage } from '../../../services/errors';
import type { SongInput } from '../../../types';
import { SongForm } from '../components/SongForm';

const EMPTY_SONG: SongInput = {
  title: '',
  artist: '',
  originalKey: 'C',
  currentKey: 'C',
  capo: 0,
  content: '',
};

export function NewSongScreen() {
  const router = useRouter();
  const { songs } = useRepositories();

  const create = async (input: SongInput) => {
    try {
      const song = await songs.create(input);
      router.replace({ pathname: '/song/[id]', params: { id: song.id } });
    } catch (error) {
      logError('createSong', error);
      Alert.alert('Não foi possível salvar', toUserMessage(error));
    }
  };

  return <SongForm initialValue={EMPTY_SONG} submitLabel="Salvar cifra" onSubmit={create} />;
}

export function EditSongScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { songs } = useRepositories();
  // SongForm keeps its own state, so a refetch on focus never overwrites what is being typed.
  const {
    data: song,
    loading,
    error,
    reload,
  } = useAsyncResource(useCallback(() => songs.getById(id), [songs, id]));

  if (loading && song === undefined) return <LoadingView />;
  if (error) return <ErrorState message={toUserMessage(error)} onRetry={reload} />;
  if (!song) return <EmptyState icon="document-outline" title="Cifra não encontrada" />;

  const save = async (input: SongInput) => {
    try {
      await songs.update(song.id, input);
      router.back();
    } catch (err) {
      logError('updateSong', err);
      Alert.alert('Não foi possível salvar', toUserMessage(err));
    }
  };

  const confirmDelete = () => {
    Alert.alert('Excluir cifra', `"${song.title}" também sairá de todos os repertórios.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await songs.remove(song.id);
            router.dismissTo('/');
          } catch (err) {
            logError('deleteSong', err);
            Alert.alert('Não foi possível excluir', toUserMessage(err));
          }
        },
      },
    ]);
  };

  return (
    <SongForm
      key={song.id}
      initialValue={song}
      submitLabel="Salvar alterações"
      onSubmit={save}
      footer={<Button label="Excluir cifra" icon="trash-outline" variant="danger" onPress={confirmDelete} />}
    />
  );
}
