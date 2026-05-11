import { z } from 'zod';

import type { Database } from '../../types/database';

export const dogSexOptions = ['unknown', 'male', 'female'] as const;

export type Dog = Database['public']['Tables']['dogs']['Row'];
export type DogSex = (typeof dogSexOptions)[number];

export interface DogMutationInput {
  name: string;
  breed: string | null;
  sex: DogSex;
  birth_date: string | null;
  color: string | null;
  microchip_number: string | null;
  notes: string | null;
}

export const dogFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter the dog name.').max(120, 'Use 120 characters or fewer.'),
  breed: optionalText(120, 'Use 120 characters or fewer.'),
  sex: z.enum(dogSexOptions),
  birthDate: z.string().trim().refine(isEmptyOrIsoDate, 'Use YYYY-MM-DD.'),
  color: optionalText(80, 'Use 80 characters or fewer.'),
  microchipNumber: optionalText(64, 'Use 64 characters or fewer.'),
  notes: optionalText(1000, 'Use 1000 characters or fewer.'),
});

export type DogFormValues = z.input<typeof dogFormSchema>;
export type ValidDogFormValues = z.output<typeof dogFormSchema>;

export function getDogFormDefaultValues(dog?: Dog | null): DogFormValues {
  return {
    name: dog?.name ?? '',
    breed: dog?.breed ?? '',
    sex: dog?.sex ?? 'unknown',
    birthDate: dog?.birth_date ?? '',
    color: dog?.color ?? '',
    microchipNumber: dog?.microchip_number ?? '',
    notes: dog?.notes ?? '',
  };
}

export function toDogMutationInput(values: ValidDogFormValues): DogMutationInput {
  return {
    name: values.name,
    breed: emptyToNull(values.breed),
    sex: values.sex,
    birth_date: emptyToNull(values.birthDate),
    color: emptyToNull(values.color),
    microchip_number: emptyToNull(values.microchipNumber),
    notes: emptyToNull(values.notes),
  };
}

export function getDogSexLabel(sex: DogSex) {
  const labels: Record<DogSex, string> = {
    unknown: 'Unknown',
    male: 'Male',
    female: 'Female',
  };

  return labels[sex];
}

function optionalText(max: number, message: string) {
  return z.string().trim().max(max, message);
}

function emptyToNull(value: string) {
  return value.length > 0 ? value : null;
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
