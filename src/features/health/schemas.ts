import { z } from 'zod';

import type { HealthEvent, HealthEventMutationInput, HealthTimelineSubject } from './types';
import { healthEventTypeOptions } from './types';

export const healthEventFormSchema = z.object({
  eventType: z.enum(healthEventTypeOptions),
  eventDate: z
    .string()
    .trim()
    .min(1, 'Introduce la fecha del evento.')
    .refine(isIsoDate, 'Usa el formato AAAA-MM-DD.'),
  title: z.string().trim().min(1, 'Introduce un título para el evento.').max(160, 'Usa 160 caracteres o menos.'),
  notes: optionalText(1000, 'Usa 1000 caracteres o menos.'),
});

export type HealthEventFormValues = z.input<typeof healthEventFormSchema>;
export type ValidHealthEventFormValues = z.output<typeof healthEventFormSchema>;

export function getHealthEventFormDefaultValues(event?: HealthEvent | null): HealthEventFormValues {
  return {
    eventType: event?.event_type ?? 'vaccine',
    eventDate: event?.event_date ?? getTodayIsoDate(),
    title: event?.title ?? '',
    notes: event?.notes ?? '',
  };
}

export function toHealthEventMutationInput(
  values: ValidHealthEventFormValues,
  subject: HealthTimelineSubject,
): HealthEventMutationInput {
  return {
    dog_id: subject.type === 'dog' ? subject.id : null,
    puppy_id: subject.type === 'puppy' ? subject.id : null,
    event_type: values.eventType,
    event_date: values.eventDate,
    title: values.title,
    notes: emptyToNull(values.notes),
  };
}

function optionalText(max: number, message: string) {
  return z.string().trim().max(max, message);
}

function emptyToNull(value: string) {
  return value.length > 0 ? value : null;
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
