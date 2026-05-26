import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createReservation, deleteReservation, listReservations, updateReservation } from './reservationsService';
import type { ReservationFilters, ReservationMutationInput } from './types';

export const reservationsQueryKeys = {
  all: ['reservations'] as const,
  byKennel: (kennelId: string | null | undefined) => [...reservationsQueryKeys.all, kennelId] as const,
  byKennelAndFilters: (kennelId: string | null | undefined, filters: ReservationFilters = {}) =>
    [
      ...reservationsQueryKeys.byKennel(kennelId),
      {
        status: filters.status ?? null,
        puppyId: filters.puppyId ?? null,
        clientId: filters.clientId ?? null,
      },
    ] as const,
};

export function useReservations(kennelId: string | null | undefined, filters: ReservationFilters = {}) {
  return useQuery({
    queryKey: reservationsQueryKeys.byKennelAndFilters(kennelId, filters),
    queryFn: () => requireKennelId(kennelId).then((id) => listReservations(id, filters)),
    enabled: Boolean(kennelId),
  });
}

export function useCreateReservation(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReservationMutationInput) =>
      requireKennelId(kennelId).then((id) => createReservation(id, input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reservationsQueryKeys.byKennel(kennelId) }),
  });
}

export function useUpdateReservation(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reservationId, input }: { reservationId: string; input: ReservationMutationInput }) =>
      requireKennelId(kennelId).then((id) => updateReservation(id, reservationId, input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reservationsQueryKeys.byKennel(kennelId) }),
  });
}

export function useDeleteReservation(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reservationId: string) =>
      requireKennelId(kennelId).then((id) => deleteReservation(id, reservationId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reservationsQueryKeys.byKennel(kennelId) }),
  });
}

async function requireKennelId(kennelId: string | null | undefined) {
  if (!kennelId) {
    throw new Error('Selecciona un criadero antes de gestionar reservas.');
  }

  return kennelId;
}
