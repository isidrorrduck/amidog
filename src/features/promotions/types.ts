import { z } from 'zod';

import type { Database } from '../../types/database';

export const promotionTypeOptions = [
  'veterinary',
  'nutrition',
  'genetics',
  'supplements',
  'grooming',
  'kennel',
  'puppies',
  'other',
] as const;
export const promotionScopeOptions = ['all', 'kennel', 'global'] as const;

export type Promotion = Database['public']['Tables']['promotions']['Row'];
export type PromotionType = (typeof promotionTypeOptions)[number];
export type PromotionScope = (typeof promotionScopeOptions)[number];

export interface PromotionFilters {
  promotionType?: PromotionType | null;
  scope?: PromotionScope | null;
}

export interface PromotionMutationInput {
  title: string;
  message: string;
  image_url: string | null;
  action_url: string | null;
  promotion_type: PromotionType;
  is_global: boolean;
}

export const promotionFormSchema = z.object({
  title: z.string().trim().min(1, 'Introduce un título para la promoción.').max(160, 'Usa 160 caracteres o menos.'),
  message: z.string().trim().min(1, 'Introduce un mensaje para la promoción.').max(2000, 'Usa 2000 caracteres o menos.'),
  imageUrl: optionalUrl('Introduce una URL de imagen válida.'),
  actionUrl: optionalUrl('Introduce una URL de acción válida.'),
  promotionType: z.enum(promotionTypeOptions),
});

export type PromotionFormValues = z.input<typeof promotionFormSchema>;
export type ValidPromotionFormValues = z.output<typeof promotionFormSchema>;

export function getPromotionFormDefaultValues(promotion?: Promotion | null): PromotionFormValues {
  return {
    title: promotion?.title ?? '',
    message: promotion?.message ?? '',
    imageUrl: promotion?.image_url ?? '',
    actionUrl: promotion?.action_url ?? '',
    promotionType: promotion?.promotion_type ?? 'kennel',
  };
}

export function toPromotionMutationInput(values: ValidPromotionFormValues): PromotionMutationInput {
  return {
    title: values.title,
    message: values.message,
    image_url: emptyToNull(values.imageUrl),
    action_url: emptyToNull(values.actionUrl),
    promotion_type: values.promotionType,
    is_global: false,
  };
}

export function getPromotionTypeLabel(promotionType: PromotionType) {
  const labels: Record<PromotionType, string> = {
    veterinary: 'Veterinaria',
    nutrition: 'Nutrición',
    genetics: 'Genética',
    supplements: 'Suplementos',
    grooming: 'Peluquería',
    kennel: 'Criadero',
    puppies: 'Cachorros',
    other: 'Otro',
  };

  return labels[promotionType];
}

export function getPromotionScopeLabel(scope: PromotionScope) {
  const labels: Record<PromotionScope, string> = {
    all: 'Todas',
    kennel: 'Del criadero',
    global: 'Global',
  };

  return labels[scope];
}

function optionalUrl(message: string) {
  return z.string().trim().max(500, 'Usa 500 caracteres o menos.').refine(isEmptyOrUrl, message);
}

function emptyToNull(value: string) {
  return value.length > 0 ? value : null;
}

function isEmptyOrUrl(value: string) {
  if (value.length === 0) {
    return true;
  }

  try {
    const url = new URL(value);

    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
