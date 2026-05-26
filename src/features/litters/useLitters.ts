import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createLitter, deleteLitter, listLitters, updateLitter } from './littersService';
import type { LitterMutationInput } from './types';

export const littersQueryKeys = {
  all: ['litters'] as const,
  byKennel: (kennelId: string | null | undefined) => [...littersQueryKeys.all, kennelId] as const,
};

export function useLitters(kennelId: string | null | undefined) {
  return useQuery({
    queryKey: littersQueryKeys.byKennel(kennelId),
    queryFn: () => requireKennelId(kennelId).then(listLitters),
    enabled: Boolean(kennelId),
  });
}

export function useCreateLitter(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LitterMutationInput) => requireKennelId(kennelId).then((id) => createLitter(id, input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: littersQueryKeys.byKennel(kennelId) }),
  });
}

export function useUpdateLitter(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ litterId, input }: { litterId: string; input: LitterMutationInput }) =>
      requireKennelId(kennelId).then((id) => updateLitter(id, litterId, input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: littersQueryKeys.byKennel(kennelId) }),
  });
}

export function useDeleteLitter(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (litterId: string) => requireKennelId(kennelId).then((id) => deleteLitter(id, litterId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: littersQueryKeys.byKennel(kennelId) }),
  });
}

async function requireKennelId(kennelId: string | null | undefined) {
  if (!kennelId) {
    throw new Error('Selecciona un criadero antes de gestionar camadas.');
  }

  return kennelId;
}
