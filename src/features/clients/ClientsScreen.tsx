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
      setScreenError('Unable to find this client in the current kennel.');
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
    Alert.alert('Delete client?', `${getClientFullName(client)} will be removed from ${currentKennel?.name ?? 'this kennel'}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
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
        <Text className="text-3xl font-bold text-slate-950">Clients</Text>
        <Text className="text-base leading-6 text-slate-600">{currentKennel?.name ?? 'Kennel'} client registry</Text>
      </View>

      <Button
        title={isFormOpen ? 'Close form' : 'Create client'}
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
        <AppCard title="Search clients">
          <Input
            placeholder="Name, email or phone"
            autoCapitalize="none"
            autoCorrect={false}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </AppCard>
      ) : null}

      {clientsQuery.isLoading ? (
        <AppCard title="Loading clients">
          <View className="items-start">
            <ActivityIndicator color="#1d4ed8" />
          </View>
        </AppCard>
      ) : null}

      {clientsQuery.error ? (
        <AppCard title="Unable to load clients">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(clientsQuery.error)}</Text>
        </AppCard>
      ) : null}

      {!clientsQuery.isLoading && !clientsQuery.error && clients.length === 0 ? (
        <AppCard title="No clients yet">
          <View className="gap-4">
            <Text className="text-sm leading-5 text-slate-600">Create the first client for this kennel.</Text>
            {!isFormOpen ? <Button title="Create client" onPress={() => router.push('/clients/new' as never)} /> : null}
          </View>
        </AppCard>
      ) : null}

      {!clientsQuery.isLoading && !clientsQuery.error && clients.length > 0 && filteredClients.length === 0 ? (
        <AppCard title="No matching clients">
          <Text className="text-sm leading-5 text-slate-600">Try another name, email or phone.</Text>
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
          <Text className="text-sm leading-5 text-slate-600">{details.join(' | ') || 'No contact details yet'}</Text>
        </View>

        {client.notes ? <Text className="text-sm leading-5 text-slate-600">{client.notes}</Text> : null}

        <View className="gap-3">
          <Button title="Documents" variant="secondary" onPress={onDocuments} />
          <View className="flex-row gap-3">
            <Button title="Edit" variant="secondary" className="flex-1" onPress={onEdit} />
            {isOwner ? (
              <Button
                title="Delete"
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong while managing clients.';
}
