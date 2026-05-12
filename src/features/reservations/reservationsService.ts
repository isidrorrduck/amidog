import { getSupabaseClient } from '../../lib/supabase';
import type { Database } from '../../types/database';
import type { Reservation, ReservationFilters, ReservationMutationInput } from './types';

type ReservationInsert = Database['public']['Tables']['reservations']['Insert'];
type ReservationUpdate = Database['public']['Tables']['reservations']['Update'];

export async function listReservations(
  kennelId: string,
  filters: ReservationFilters = {},
): Promise<Reservation[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('reservations')
    .select('*')
    .eq('kennel_id', kennelId)
    .order('reservation_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.puppyId) {
    query = query.eq('puppy_id', filters.puppyId);
  }

  if (filters.clientId) {
    query = query.eq('client_id', filters.clientId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createReservation(
  kennelId: string,
  input: ReservationMutationInput,
): Promise<Reservation> {
  const supabase = getSupabaseClient();
  const payload: ReservationInsert = {
    kennel_id: kennelId,
    ...input,
  };

  const { data, error } = await supabase.from('reservations').insert(payload).select().single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateReservation(
  kennelId: string,
  reservationId: string,
  input: ReservationMutationInput,
): Promise<Reservation> {
  const supabase = getSupabaseClient();
  const payload: ReservationUpdate = {
    ...input,
  };

  const { data, error } = await supabase
    .from('reservations')
    .update(payload)
    .eq('id', reservationId)
    .eq('kennel_id', kennelId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteReservation(kennelId: string, reservationId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', reservationId)
    .eq('kennel_id', kennelId);

  if (error) {
    throw error;
  }
}
