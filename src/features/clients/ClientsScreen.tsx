import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

import { Button, AppCard, Input, AppScreen } from '../../components';
import { ProtectedRoute } from '../auth';
import { useCurrentKennel } from '../kennels';
import { ClientForm } from './ClientForm';
import { getClientFullName, type Client, type ClientMutationInput } from './types';
import { useClients, useCreateClient, useDeleteClient, useUpdateClient } from './useClients';

interface ClientsScreenProps {
  initialMode?: 'create';
  initialClientId?: string | null;
}

export function ClientsScreen(props: ClientsScreenProps = {}) {
  return (
    <ProtectedRoute>
      <ClientsContent {...props} />
    </ProtectedRoute>
  );
}

function ClientsContent({ initialMode, initialClientId }: ClientsScreenProps) {
  const { currentKennel, currentMembership } = useCurrentKennel();
  const kennelId = currentKennel?.id ?? null;
  const clientsQuery = useClients(kennelId);
  const createClientMutation = useCreateClient(kennelId);
  const updateClientMutation = useUpdateClient(kennelId);
  const deleteClientMutation = useDeleteClient(kennelId);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(initialMode === 'create');
  const [searchTerm, setSearchTerm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  const clients = clientsQuery.data ?? [];
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredClients = useMemo(
    () => clients.filter((client) => clientMatchesSearch(client, normalizedSearchTerm)),
    [clients, normalizedSearchTerm],
  );
  const isOwner = currentMembership?.role === 'owner';
  const isFormSubmitting = createClientMutation.isPending || updateClientMutation.isPending;
  const isRouteForm = initialMode === 'create' || Boolean(initialClientId);

  useEffect(() => {
    if (!initialClientId || editingClient || clientsQuery.isLoading) {
      return;
    }

    const client = clients.find((item) => item.id === initialClientId);

    if (client) {
      openEditForm(client);
    } else if (!clientsQuery.error) {
      setScreenError('No se ha encontrado este cliente en el criadero actual.');
    }
  }, [clients, clientsQuery.error, clientsQuery.isLoading, editingClient, initialClientId]);

  const openEditForm = (client: Client) => {
    setEditingClient(client);
    setFormError(null);
    setScreenError(null);
    createClientMutation.reset();
    updateClientMutation.reset();
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setEditingClient(null);
    setFormError(null);
    setIsFormOpen(false);

    if (isRouteForm) {
      router.replace('/clients' as never);
    }
  };

  const handleSubmitClient = async (input: ClientMutationInput) => {
    setFormError(null);

    try {
      if (editingClient) {
        await updateClientMutation.mutateAsync({ clientId: editingClient.id, input });
      } else {
        await createClientMutation.mutateAsync(input);
      }

      closeForm();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const handleDeleteClient = (client: Client) => {
    Alert.alert('¿Eliminar cliente?', `Se eliminará a ${getClientFullName(client)} de ${currentKennel?.name ?? 'este criadero'}.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void deleteClientMutation.mutateAsync(client.id).catch((error) => {
            setScreenError(getErrorMessage(error));
          });
        },
      },
    ]);
  };

  return (
    <AppScreen scrollable>
      <View className="gap-2">
        <Text className="text-3xl font-bold text-slate-950">Clientes</Text>
        <Text className="text-base leading-6 text-slate-600">Registro de clientes de {currentKennel?.name ?? 'criadero'}</Text>
      </View>

      <Button
        title={isFormOpen ? 'Cerrar formulario' : 'Crear cliente'}
        variant={isFormOpen ? 'secondary' : 'primary'}
        onPress={isFormOpen ? closeForm : () => router.push('/clients/new' as never)}
      />

      {screenError ? (
        <AppCard>
          <Text className="text-sm leading-5 text-red-600">{screenError}</Text>
        </AppCard>
      ) : null}

      {isFormOpen ? (
        <ClientForm
          client={editingClient}
          errorMessage={formError}
          isSubmitting={isFormSubmitting}
          onCancel={closeForm}
          onSubmit={handleSubmitClient}
        />
      ) : null}

      {clients.length > 0 || searchTerm.length > 0 ? (
        <AppCard title="Buscar clientes">
          <Input
            placeholder="Nombre, correo o teléfono"
            autoCapitalize="none"
            autoCorrect={false}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </AppCard>
      ) : null}

      {clientsQuery.isLoading ? (
        <AppCard title="Cargando clientes">
          <View className="items-start">
            <ActivityIndicator color="#1d4ed8" />
          </View>
        </AppCard>
      ) : null}

      {clientsQuery.error ? (
        <AppCard title="No se han podido cargar los clientes">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(clientsQuery.error)}</Text>
        </AppCard>
      ) : null}

      {!clientsQuery.isLoading && !clientsQuery.error && clients.length === 0 ? (
        <AppCard title="Todavía no hay clientes">
          <View className="gap-4">
            <Text className="text-sm leading-5 text-slate-600">Crea el primer cliente de este criadero.</Text>
            {!isFormOpen ? <Button title="Crear cliente" onPress={() => router.push('/clients/new' as never)} /> : null}
          </View>
        </AppCard>
      ) : null}

      {!clientsQuery.isLoading && !clientsQuery.error && clients.length > 0 && filteredClients.length === 0 ? (
        <AppCard title="No hay clientes que coincidan">
          <Text className="text-sm leading-5 text-slate-600">Prueba con otro nombre, correo o teléfono.</Text>
        </AppCard>
      ) : null}

      {filteredClients.length > 0 ? (
        <View className="gap-3">
          {filteredClients.map((client) => (
            <ClientCard
              client={client}
              isDeleting={deleteClientMutation.isPending}
              isOwner={isOwner}
              key={client.id}
              onDelete={() => handleDeleteClient(client)}
              onDocuments={() => router.push(`/documents?entityType=client&entityId=${client.id}` as never)}
              onEdit={() => router.push(`/clients/${client.id}` as never)}
            />
          ))}
        </View>
      ) : null}
    </AppScreen>
  );
}

interface ClientCardProps {
  client: Client;
  isDeleting: boolean;
  isOwner: boolean;
  onDelete: () => void;
  onDocuments: () => void;
  onEdit: () => void;
}

function ClientCard({ client, isDeleting, isOwner, onDelete, onDocuments, onEdit }: ClientCardProps) {
  const location = [client.city, client.country].filter(Boolean).join(', ');
  const details = [client.email, client.phone, client.address, location].filter(Boolean);

  return (
    <AppCard>
      <View className="gap-3">
        <View className="gap-1">
          <Text className="text-xl font-semibold text-slate-950">{getClientFullName(client)}</Text>
          <Text className="text-sm leading-5 text-slate-600">{details.join(' | ') || 'Sin datos de contacto todavía'}</Text>
        </View>

        {client.notes ? <Text className="text-sm leading-5 text-slate-600">{client.notes}</Text> : null}

        <View className="gap-3">
          <Button title="Documentos" variant="secondary" onPress={onDocuments} />
          <View className="flex-row gap-3">
            <Button title="Editar" variant="secondary" className="flex-1" onPress={onEdit} />
            {isOwner ? (
              <Button
                title="Eliminar"
                variant="ghost"
                loading={isDeleting}
                className="flex-1"
                textClassName="text-red-600"
                onPress={onDelete}
              />
            ) : null}
          </View>
        </View>
      </View>
    </AppCard>
  );
}

function clientMatchesSearch(client: Client, normalizedSearchTerm: string) {
  if (normalizedSearchTerm.length === 0) {
    return true;
  }

  return [client.first_name, client.last_name, client.email, client.phone]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(normalizedSearchTerm);
}

function getErrorMessage(_error: unknown) {
  return 'Algo ha ido mal al gestionar los clientes.';
}
