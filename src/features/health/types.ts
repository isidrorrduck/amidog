import type { Database } from '../../types/database';

export const healthEventTypeOptions = [
  'vaccine',
  'deworming',
  'weight',
  'vet_visit',
  'medication',
  'pregnancy_check',
  'birth',
  'other',
] as const;

export type HealthEvent = Database['public']['Tables']['health_events']['Row'];
export type HealthEventType = (typeof healthEventTypeOptions)[number];
export type HealthSubjectType = 'dog' | 'puppy';

export interface HealthEventFilters {
  dogId?: string | null;
  puppyId?: string | null;
}

export interface HealthEventMutationInput {
  dog_id: string | null;
  puppy_id: string | null;
  event_type: HealthEventType;
  event_date: string;
  title: string;
  notes: string | null;
}

export interface HealthTimelineSubject {
  id: string;
  label: string;
  type: HealthSubjectType;
}

export type HealthEventTone = 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

export function getHealthEventTypeLabel(eventType: HealthEventType) {
  const labels: Record<HealthEventType, string> = {
    vaccine: 'Vacuna',
    deworming: 'Desparasitación',
    weight: 'Peso',
    vet_visit: 'Visita veterinaria',
    medication: 'Medicación',
    pregnancy_check: 'Control gestación',
    birth: 'Nacimiento',
    other: 'Otro',
  };

  return labels[eventType];
}

export function getHealthEventTypeTone(eventType: HealthEventType): HealthEventTone {
  const tones: Record<HealthEventType, HealthEventTone> = {
    vaccine: 'success',
    deworming: 'brand',
    weight: 'accent',
    vet_visit: 'warning',
    medication: 'danger',
    pregnancy_check: 'accent',
    birth: 'success',
    other: 'neutral',
  };

  return tones[eventType];
}
