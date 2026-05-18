import { z } from 'zod';

import type { Database } from '../../types/database';

export const puppySexOptions = ['unknown', 'male', 'female'] as const;
export const puppyStatusOptions = ['available', 'reserved', 'sold', 'keeper', 'deceased'] as const;

export type Puppy = Database['public']['Tables']['puppies']['Row'];
export type PuppySex = (typeof puppySexOptions)[number];
export type PuppyStatus = (typeof puppyStatusOptions)[number];

export interface PuppyMutationInput {
  litter_id: string;
  client_id: string | null;
  name: string;
  sex: PuppySex;
  birth_date: string | null;
  color: string | null;
  status: PuppyStatus;
  notes: string | null;
}

export const puppyFormSchema = z.object({
  litterId: requiredUuid('Elige una camada para este cachorro.'),
  clientId: optionalUuid('Elige un cliente de este criadero.'),
  name: z.string().trim().min(1, 'Introduce el nombre del cachorro.').max(120, 'Usa 120 caracteres o menos.'),
  sex: z.enum(puppySexOptions),
  birthDate: z.string().trim().refine(isEmptyOrIsoDate, 'Usa el formato AAAA-MM-DD.'),
  color: optionalText(80, 'Usa 80 caracteres o menos.'),
  status: z.enum(puppyStatusOptions),
  notes: optionalText(1000, 'Usa 1000 caracteres o menos.'),
});

export type PuppyFormValues = z.input<typeof puppyFormSchema>;
export type ValidPuppyFormValues = z.output<typeof puppyFormSchema>;

export function getPuppyFormDefaultValues(puppy?: Puppy | null, defaultLitterId = ''): PuppyFormValues {
  return {
    litterId: puppy?.litter_id ?? defaultLitterId,
    clientId: puppy?.client_id ?? '',
    name: puppy?.name ?? '',
    sex: puppy?.sex ?? 'unknown',
    birthDate: puppy?.birth_date ?? '',
    color: puppy?.color ?? '',
    status: puppy?.status ?? 'available',
    notes: puppy?.notes ?? '',
  };
}

export function toPuppyMutationInput(values: ValidPuppyFormValues): PuppyMutationInput {
  return {
    litter_id: values.litterId,
    client_id: emptyToNull(values.clientId),
    name: values.name,
    sex: values.sex,
    birth_date: emptyToNull(values.birthDate),
    color: emptyToNull(values.color),
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
    sold: 'Vendido',
    keeper: 'Se queda en el criadero',
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

function optionalUuid(message: string) {
  return z.string().trim().refine(isEmptyOrUuid, message);
}

function emptyToNull(value: string) {
  return value.length > 0 ? value : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isEmptyOrUuid(value: string) {
  return value.length === 0 || isUuid(value);
}

function isEmptyOrIsoDate(value: string) {
  if (value.length === 0) {
    return true;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
