import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { Button, EmptyState, ErrorState, LoadingView } from '../../../components';
import { useRepositories } from '../../../database/useRepositories';
import { useAsyncResource } from '../../../hooks/useAsyncResource';
import { logError, toUserMessage } from '../../../services/errors';
import type { RepertoireInput } from '../../../types';
import { RepertoireForm } from '../components/RepertoireForm';

export function NewRepertoireScreen() {
  const router = useRouter();
  const { repertoires } = useRepositories();

  const create = async (input: RepertoireInput) => {
    try {
      const repertoire = await repertoires.create(input);
      router.replace({ pathname: '/repertoire/[id]', params: { id: repertoire.id } });
    } catch (error) {
      logError('createRepertoire', error);
      Alert.alert('Não foi possível salvar', toUserMessage(error));
    }
  };

  return (
    <RepertoireForm
      initialValue={{ name: '', date: null }}
      submitLabel="Criar repertório"
      onSubmit={create}
    />
  );
}

export function EditRepertoireScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repertoires } = useRepositories();
  const { data, loading, error, reload } = useAsyncResource(
    useCallback(() => repertoires.getById(id), [repertoires, id]),
  );

  if (loading && data === undefined) return <LoadingView />;
  if (error) return <ErrorState message={toUserMessage(error)} onRetry={reload} />;
  if (!data) return <EmptyState icon="list-outline" title="Repertório não encontrado" />;

  const save = async (input: RepertoireInput) => {
    try {
      await repertoires.update(data.id, input);
      router.back();
    } catch (err) {
      logError('updateRepertoire', err);
      Alert.alert('Não foi possível salvar', toUserMessage(err));
    }
  };

  const confirmDelete = () => {
    Alert.alert('Excluir repertório', `"${data.name}" será excluído. As cifras continuam na biblioteca.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await repertoires.remove(data.id);
            router.dismissTo('/repertoires');
          } catch (err) {
            logError('deleteRepertoire', err);
            Alert.alert('Não foi possível excluir', toUserMessage(err));
          }
        },
      },
    ]);
  };

  return (
    <RepertoireForm
      key={data.id}
      initialValue={{ name: data.name, date: data.date }}
      submitLabel="Salvar alterações"
      onSubmit={save}
      footer={
        <Button label="Excluir repertório" icon="trash-outline" variant="danger" onPress={confirmDelete} />
      }
    />
  );
}
