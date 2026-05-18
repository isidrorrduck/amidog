import { z } from 'zod';

import type { Database } from '../../types/database';

export const puppySexOptions = ['unknown', 'male', 'female'] as const;
export const puppyStatusOptions = ['available', 'reserved', 'placed', 'kept', 'deceased'] as const;

export type Puppy = Database['public']['Tables']['puppies']['Row'];
export type PuppySex = (typeof puppySexOptions)[number];
export type PuppyStatus = (typeof puppyStatusOptions)[number];

export interface PuppyMutationInput {
  litter_id: string;
  name: string;
  sex: PuppySex;
  color: string | null;
  birth_weight: number | null;
  status: PuppyStatus;
  notes: string | null;
}

export const puppyFormSchema = z.object({
  litterId: requiredUuid('Elige una camada para este cachorro.'),
  name: z.string().trim().min(1, 'Introduce el nombre del cachorro.').max(120, 'Usa 120 caracteres o menos.'),
  sex: z.enum(puppySexOptions),
  color: optionalText(80, 'Usa 80 caracteres o menos.'),
  birthWeight: z.string().trim().refine(isEmptyOrWeight, 'Introduce un peso al nacer válido.'),
  status: z.enum(puppyStatusOptions),
  notes: optionalText(1000, 'Usa 1000 caracteres o menos.'),
});

export type PuppyFormValues = z.input<typeof puppyFormSchema>;
export type ValidPuppyFormValues = z.output<typeof puppyFormSchema>;

export function getPuppyFormDefaultValues(puppy?: Puppy | null, defaultLitterId = ''): PuppyFormValues {
  return {
    litterId: puppy?.litter_id ?? defaultLitterId,
    name: puppy?.name ?? '',
    sex: puppy?.sex ?? 'unknown',
    color: puppy?.color ?? '',
    birthWeight: puppy?.birth_weight === null || puppy?.birth_weight === undefined ? '' : String(puppy.birth_weight),
    status: puppy?.status ?? 'available',
    notes: puppy?.notes ?? '',
  };
}

export function toPuppyMutationInput(values: ValidPuppyFormValues): PuppyMutationInput {
  return {
    litter_id: values.litterId,
    name: values.name,
    sex: values.sex,
    color: emptyToNull(values.color),
    birth_weight: emptyToNumber(values.birthWeight),
    status: values.status,
    notes: emptyToNull(values.notes),
  };
}

export function getPuppySexLabel(sex: PuppySex) {
  const labels: Record<PuppySex, string> = {
    unknown: 'Sin especificar',
    male: 'Macho',
    female: 'Hembra',
  };

  return labels[sex];
}

export function getPuppyStatusLabel(status: PuppyStatus) {
  const labels: Record<PuppyStatus, string> = {
    available: 'Disponible',
    reserved: 'Reservado',
    placed: 'Entregado',
    kept: 'Se queda en casa',
    deceased: 'Fallecido',
  };

  return labels[status];
}

function optionalText(max: number, message: string) {
  return z.string().trim().max(max, message);
}

function requiredUuid(message: string) {
  return z.string().trim().refine(isUuid, message);
}

function emptyToNull(value: string) {
  return value.length > 0 ? value : null;
}

function emptyToNumber(value: string) {
  return value.length > 0 ? Number(value) : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isEmptyOrWeight(value: string) {
  return value.length === 0 || /^\d+(\.\d{1,2})?$/.test(value);
}
