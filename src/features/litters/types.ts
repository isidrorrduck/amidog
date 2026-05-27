import { z } from 'zod';

import type { Database } from '../../types/database';

export const litterStatusOptions = ['planned', 'expected', 'born', 'archived'] as const;

export type Litter = Database['public']['Tables']['litters']['Row'];
export type LitterStatus = (typeof litterStatusOptions)[number];

export interface LitterMutationInput {
  name: string;
  mother_id: string | null;
  father_id: string | null;
  birth_date: string | null;
  expected_birth_date: string | null;
  status: LitterStatus;
  notes: string | null;
}

export const litterFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Introduce el nombre de la camada.').max(120, 'Usa 120 caracteres o menos.'),
    motherId: optionalUuid(),
    fatherId: optionalUuid(),
    birthDate: z.string().trim().refine(isEmptyOrIsoDate, 'Usa el formato AAAA-MM-DD.'),
    expectedBirthDate: z.string().trim().refine(isEmptyOrIsoDate, 'Usa el formato AAAA-MM-DD.'),
    status: z.enum(litterStatusOptions),
    notes: optionalText(1000, 'Usa 1000 caracteres o menos.'),
  })
  .superRefine((values, context) => {
    if (values.motherId && values.fatherId && values.motherId === values.fatherId) {
      context.addIssue({
        code: 'custom',
        message: 'Elige perros distintos para la madre y el padre.',
        path: ['fatherId'],
      });
    }
  });

export type LitterFormValues = z.input<typeof litterFormSchema>;
export type ValidLitterFormValues = z.output<typeof litterFormSchema>;

export function getLitterFormDefaultValues(litter?: Litter | null): LitterFormValues {
  return {
    name: litter?.name ?? '',
    motherId: litter?.mother_id ?? '',
    fatherId: litter?.father_id ?? '',
    birthDate: litter?.birth_date ?? '',
    expectedBirthDate: litter?.expected_birth_date ?? '',
    status: litter?.status ?? 'planned',
    notes: litter?.notes ?? '',
  };
}

export function toLitterMutationInput(values: ValidLitterFormValues): LitterMutationInput {
  return {
    name: values.name,
    mother_id: emptyToNull(values.motherId),
    father_id: emptyToNull(values.fatherId),
    birth_date: emptyToNull(values.birthDate),
    expected_birth_date: emptyToNull(values.expectedBirthDate),
    status: values.status,
    notes: emptyToNull(values.notes),
  };
}

export function getLitterStatusLabel(status: LitterStatus) {
  const labels: Record<LitterStatus, string> = {
    planned: 'Planificada',
    expected: 'Esperada',
    born: 'Nacida',
    archived: 'Archivada',
  };

  return labels[status];
}

function optionalText(max: number, message: string) {
  return z.string().trim().max(max, message);
}

function optionalUuid() {
  return z.string().trim().refine(isEmptyOrUuid, 'Elige un perro de este criadero.');
}

function emptyToNull(value: string) {
  return value.length > 0 ? value : null;
}

function isEmptyOrUuid(value: string) {
  return value.length === 0 || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
