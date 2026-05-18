import { z } from 'zod';

import type { Database } from '../../types/database';

export const reservationStatusOptions = ['pending', 'reserved', 'paid', 'cancelled', 'completed'] as const;

export type Reservation = Database['public']['Tables']['reservations']['Row'];
export type ReservationStatus = (typeof reservationStatusOptions)[number];

export interface ReservationFilters {
  status?: ReservationStatus | null;
  puppyId?: string | null;
  clientId?: string | null;
}

export interface ReservationMutationInput {
  puppy_id: string;
  client_id: string;
  status: ReservationStatus;
  reserved_price: number | null;
  deposit_amount: number | null;
  deposit_paid: boolean;
  reservation_date: string;
  notes: string | null;
}

export const reservationFormSchema = z
  .object({
    puppyId: requiredUuid('Elige un cachorro para esta reserva.'),
    clientId: requiredUuid('Elige un cliente para esta reserva.'),
    status: z.enum(reservationStatusOptions),
    reservedPrice: moneyText('Introduce un precio reservado válido.'),
    depositAmount: moneyText('Introduce una señal válida.'),
    depositPaid: z.boolean(),
    reservationDate: z
      .string()
      .trim()
      .min(1, 'Introduce la fecha de reserva.')
      .refine(isIsoDate, 'Usa el formato AAAA-MM-DD.'),
    notes: optionalText(1000, 'Usa 1000 caracteres o menos.'),
  })
  .superRefine((values, context) => {
    const reservedPrice = emptyToNumber(values.reservedPrice);
    const depositAmount = emptyToNumber(values.depositAmount);

    if (reservedPrice !== null && depositAmount !== null && depositAmount > reservedPrice) {
      context.addIssue({
        code: 'custom',
        message: 'La señal no puede ser mayor que el precio reservado.',
        path: ['depositAmount'],
      });
    }
  });

export type ReservationFormValues = z.input<typeof reservationFormSchema>;
export type ValidReservationFormValues = z.output<typeof reservationFormSchema>;

export function getReservationFormDefaultValues(
  reservation?: Reservation | null,
  defaults: { puppyId?: string | null; clientId?: string | null } = {},
): ReservationFormValues {
  return {
    puppyId: reservation?.puppy_id ?? defaults.puppyId ?? '',
    clientId: reservation?.client_id ?? defaults.clientId ?? '',
    status: reservation?.status ?? 'pending',
    reservedPrice:
      reservation?.reserved_price === null || reservation?.reserved_price === undefined
        ? ''
        : String(reservation.reserved_price),
    depositAmount:
      reservation?.deposit_amount === null || reservation?.deposit_amount === undefined
        ? ''
        : String(reservation.deposit_amount),
    depositPaid: reservation?.deposit_paid ?? false,
    reservationDate: reservation?.reservation_date ?? getTodayIsoDate(),
    notes: reservation?.notes ?? '',
  };
}

export function toReservationMutationInput(values: ValidReservationFormValues): ReservationMutationInput {
  return {
    puppy_id: values.puppyId,
    client_id: values.clientId,
    status: values.status,
    reserved_price: emptyToNumber(values.reservedPrice),
    deposit_amount: emptyToNumber(values.depositAmount),
    deposit_paid: values.depositPaid,
    reservation_date: values.reservationDate,
    notes: emptyToNull(values.notes),
  };
}

export function getReservationStatusLabel(status: ReservationStatus) {
  const labels: Record<ReservationStatus, string> = {
    pending: 'Pendiente',
    reserved: 'Reservada',
    paid: 'Pagada',
    cancelled: 'Cancelada',
    completed: 'Completada',
  };

  return labels[status];
}

function optionalText(max: number, message: string) {
  return z.string().trim().max(max, message);
}

function requiredUuid(message: string) {
  return z.string().trim().refine(isUuid, message);
}

function moneyText(message: string) {
  return z.string().trim().refine(isEmptyOrMoney, message);
}

function emptyToNull(value: string) {
  return value.length > 0 ? value : null;
}

function emptyToNumber(value: string) {
  return value.length > 0 ? Number(value) : null;
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

function isEmptyOrMoney(value: string) {
  if (value.length === 0) {
    return true;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    return false;
  }

  return Number(value) <= 9999999999.99;
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
