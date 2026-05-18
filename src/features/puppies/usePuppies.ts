import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createPuppy, deletePuppy, listPuppies, updatePuppy } from './puppiesService';
import type { PuppyMutationInput } from './types';

export const puppiesQueryKeys = {
  all: ['puppies'] as const,
  byKennel: (kennelId: string | null | undefined) => [...puppiesQueryKeys.all, kennelId] as const,
  byKennelAndLitter: (kennelId: string | null | undefined, litterId: string | null | undefined) =>
    [...puppiesQueryKeys.byKennel(kennelId), { litterId: litterId ?? null }] as const,
};

export function usePuppies(kennelId: string | null | undefined, litterId?: string | null) {
  return useQuery({
    queryKey: puppiesQueryKeys.byKennelAndLitter(kennelId, litterId),
    queryFn: () => requireKennelId(kennelId).then((id) => listPuppies(id, litterId)),
    enabled: Boolean(kennelId),
  });
}

export function useCreatePuppy(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PuppyMutationInput) => requireKennelId(kennelId).then((id) => createPuppy(id, input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: puppiesQueryKeys.byKennel(kennelId) }),
  });
}

export function useUpdatePuppy(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ puppyId, input }: { puppyId: string; input: PuppyMutationInput }) =>
      requireKennelId(kennelId).then((id) => updatePuppy(id, puppyId, input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: puppiesQueryKeys.byKennel(kennelId) }),
  });
}

export function useDeletePuppy(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (puppyId: string) => requireKennelId(kennelId).then((id) => deletePuppy(id, puppyId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: puppiesQueryKeys.byKennel(kennelId) }),
  });
}

async function requireKennelId(kennelId: string | null | undefined) {
  if (!kennelId) {
    throw new Error('Selecciona un criadero antes de gestionar cachorros.');
  }

  return kennelId;
}
