import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createPromotion, deletePromotion, getPromotion, listPromotions, updatePromotion } from './promotionsService';
import type { PromotionFilters, PromotionMutationInput } from './types';

export const promotionsQueryKeys = {
  all: ['promotions'] as const,
  byKennel: (kennelId: string | null | undefined) => [...promotionsQueryKeys.all, kennelId] as const,
  byKennelAndFilters: (kennelId: string | null | undefined, filters: PromotionFilters = {}) =>
    [
      ...promotionsQueryKeys.byKennel(kennelId),
      {
        promotionType: filters.promotionType ?? null,
        scope: filters.scope ?? null,
      },
    ] as const,
  detail: (kennelId: string | null | undefined, promotionId: string | null | undefined) =>
    [...promotionsQueryKeys.byKennel(kennelId), 'detail', promotionId ?? null] as const,
};

export function usePromotions(kennelId: string | null | undefined, filters: PromotionFilters = {}) {
  return useQuery({
    queryKey: promotionsQueryKeys.byKennelAndFilters(kennelId, filters),
    queryFn: () => requireKennelId(kennelId).then((id) => listPromotions(id, filters)),
    enabled: Boolean(kennelId),
  });
}

export function usePromotion(kennelId: string | null | undefined, promotionId: string | null | undefined) {
  return useQuery({
    queryKey: promotionsQueryKeys.detail(kennelId, promotionId),
    queryFn: () => requireKennelId(kennelId).then((id) => getPromotion(id, requirePromotionId(promotionId))),
    enabled: Boolean(kennelId && promotionId),
  });
}

export function useCreatePromotion(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PromotionMutationInput) => requireKennelId(kennelId).then((id) => createPromotion(id, input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.byKennel(kennelId) });
      void queryClient.invalidateQueries({ queryKey: ['notifications', kennelId] });
    },
  });
}

export function useUpdatePromotion(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ promotionId, input }: { promotionId: string; input: PromotionMutationInput }) =>
      requireKennelId(kennelId).then((id) => updatePromotion(id, promotionId, input)),
    onSuccess: (_promotion, variables) => {
      void queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.byKennel(kennelId) });
      void queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.detail(kennelId, variables.promotionId) });
    },
  });
}

export function useDeletePromotion(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (promotionId: string) => requireKennelId(kennelId).then((id) => deletePromotion(id, promotionId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.byKennel(kennelId) }),
  });
}

async function requireKennelId(kennelId: string | null | undefined) {
  if (!kennelId) {
    throw new Error('Select a kennel before managing promotions.');
  }

  return kennelId;
}

function requirePromotionId(promotionId: string | null | undefined) {
  if (!promotionId) {
    throw new Error('Choose a promotion first.');
  }

  return promotionId;
}
