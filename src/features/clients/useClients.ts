import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createClient, deleteClient, listClients, updateClient } from './clientsService';
import type { ClientMutationInput } from './types';

export const clientsQueryKeys = {
  all: ['clients'] as const,
  byKennel: (kennelId: string | null | undefined) => [...clientsQueryKeys.all, kennelId] as const,
};

export function useClients(kennelId: string | null | undefined) {
  return useQuery({
    queryKey: clientsQueryKeys.byKennel(kennelId),
    queryFn: () => requireKennelId(kennelId).then(listClients),
    enabled: Boolean(kennelId),
  });
}

export function useCreateClient(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ClientMutationInput) => requireKennelId(kennelId).then((id) => createClient(id, input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientsQueryKeys.byKennel(kennelId) }),
  });
}

export function useUpdateClient(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, input }: { clientId: string; input: ClientMutationInput }) =>
      requireKennelId(kennelId).then((id) => updateClient(id, clientId, input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientsQueryKeys.byKennel(kennelId) }),
  });
}

export function useDeleteClient(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: string) => requireKennelId(kennelId).then((id) => deleteClient(id, clientId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientsQueryKeys.byKennel(kennelId) }),
  });
}

async function requireKennelId(kennelId: string | null | undefined) {
  if (!kennelId) {
    throw new Error('Selecciona un criadero antes de gestionar clientes.');
  }

  return kennelId;
}
