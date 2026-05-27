import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createDog, deleteDog, listDogs, updateDog } from './dogsService';
import type { DogMutationInput } from './types';

export const dogsQueryKeys = {
  all: ['dogs'] as const,
  byKennel: (kennelId: string | null | undefined) => [...dogsQueryKeys.all, kennelId] as const,
};

export function useDogs(kennelId: string | null | undefined) {
  return useQuery({
    queryKey: dogsQueryKeys.byKennel(kennelId),
    queryFn: () => requireKennelId(kennelId).then(listDogs),
    enabled: Boolean(kennelId),
  });
}

export function useCreateDog(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DogMutationInput) => requireKennelId(kennelId).then((id) => createDog(id, input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dogsQueryKeys.byKennel(kennelId) }),
  });
}

export function useUpdateDog(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dogId, input }: { dogId: string; input: DogMutationInput }) =>
      requireKennelId(kennelId).then((id) => updateDog(id, dogId, input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dogsQueryKeys.byKennel(kennelId) }),
  });
}

export function useDeleteDog(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dogId: string) => requireKennelId(kennelId).then((id) => deleteDog(id, dogId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dogsQueryKeys.byKennel(kennelId) }),
  });
}

async function requireKennelId(kennelId: string | null | undefined) {
  if (!kennelId) {
    throw new Error('Selecciona un criadero antes de gestionar perros.');
  }

  return kennelId;
}
