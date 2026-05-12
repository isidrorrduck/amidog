import { z } from 'zod';

import type { Database } from '../../types/database';

export type Client = Database['public']['Tables']['clients']['Row'];

export interface ClientMutationInput {
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
}

export const clientFormSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter the client first name.').max(120, 'Use 120 characters or fewer.'),
  lastName: optionalText(120, 'Use 120 characters or fewer.'),
  email: z
    .string()
    .trim()
    .max(254, 'Use 254 characters or fewer.')
    .refine(isEmptyOrEmail, 'Enter a valid email address.'),
  phone: optionalText(40, 'Use 40 characters or fewer.'),
  address: optionalText(240, 'Use 240 characters or fewer.'),
  city: optionalText(120, 'Use 120 characters or fewer.'),
  country: optionalText(120, 'Use 120 characters or fewer.'),
  notes: optionalText(1000, 'Use 1000 characters or fewer.'),
});

export type ClientFormValues = z.input<typeof clientFormSchema>;
export type ValidClientFormValues = z.output<typeof clientFormSchema>;

export function getClientFormDefaultValues(client?: Client | null): ClientFormValues {
  return {
    firstName: client?.first_name ?? '',
    lastName: client?.last_name ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    address: client?.address ?? '',
    city: client?.city ?? '',
    country: client?.country ?? '',
    notes: client?.notes ?? '',
  };
}

export function toClientMutationInput(values: ValidClientFormValues): ClientMutationInput {
  return {
    first_name: values.firstName,
    last_name: emptyToNull(values.lastName),
    email: emptyToNull(values.email),
    phone: emptyToNull(values.phone),
    address: emptyToNull(values.address),
    city: emptyToNull(values.city),
    country: emptyToNull(values.country),
    notes: emptyToNull(values.notes),
  };
}

export function getClientFullName(client: Pick<Client, 'first_name' | 'last_name'>) {
  return [client.first_name, client.last_name].filter(Boolean).join(' ');
}

function optionalText(max: number, message: string) {
  return z.string().trim().max(max, message);
}

function emptyToNull(value: string) {
  return value.length > 0 ? value : null;
}

function isEmptyOrEmail(value: string) {
  return value.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
