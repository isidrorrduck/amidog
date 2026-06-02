import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createHealthEvent, deleteHealthEvent, listHealthEvents, updateHealthEvent } from './services';
import type { HealthEventFilters, HealthEventMutationInput } from './types';

export const healthEventsQueryKeys = {
  all: ['healthEvents'] as const,
  byKennel: (kennelId: string | null | undefined) => [...healthEventsQueryKeys.all, kennelId] as const,
  byKennelAndFilters: (kennelId: string | null | undefined, filters: HealthEventFilters = {}) =>
    [
      ...healthEventsQueryKeys.byKennel(kennelId),
      {
        dogId: filters.dogId ?? null,
        puppyId: filters.puppyId ?? null,
      },
    ] as const,
};

export function useHealthEvents(kennelId: string | null | undefined, filters: HealthEventFilters = {}) {
  return useQuery({
    queryKey: healthEventsQueryKeys.byKennelAndFilters(kennelId, filters),
    queryFn: () => requireKennelId(kennelId).then((id) => listHealthEvents(id, filters)),
    enabled: Boolean(kennelId && (filters.dogId || filters.puppyId)),
  });
}

export function useDogHealthEvents(kennelId: string | null | undefined, dogId: string | null | undefined) {
  return useHealthEvents(kennelId, { dogId });
}

export function usePuppyHealthEvents(kennelId: string | null | undefined, puppyId: string | null | undefined) {
  return useHealthEvents(kennelId, { puppyId });
}

export function useCreateHealthEvent(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: HealthEventMutationInput) =>
      requireKennelId(kennelId).then((id) => createHealthEvent(id, input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: healthEventsQueryKeys.byKennel(kennelId) }),
  });
}

export function useUpdateHealthEvent(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ healthEventId, input }: { healthEventId: string; input: HealthEventMutationInput }) =>
      requireKennelId(kennelId).then((id) => updateHealthEvent(id, healthEventId, input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: healthEventsQueryKeys.byKennel(kennelId) }),
  });
}

export function useDeleteHealthEvent(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (healthEventId: string) =>
      requireKennelId(kennelId).then((id) => deleteHealthEvent(id, healthEventId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: healthEventsQueryKeys.byKennel(kennelId) }),
  });
}

async function requireKennelId(kennelId: string | null | undefined) {
  if (!kennelId) {
    throw new Error('Selecciona un criadero antes de gestionar eventos de salud.');
  }

  return kennelId;
}
