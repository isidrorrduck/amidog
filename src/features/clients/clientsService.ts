import { getSupabaseClient } from '../../lib/supabase';
import type { Database } from '../../types/database';
import type { Client, ClientMutationInput } from './types';

type ClientInsert = Database['public']['Tables']['clients']['Insert'];
type ClientUpdate = Database['public']['Tables']['clients']['Update'];

export async function listClients(kennelId: string): Promise<Client[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('kennel_id', kennelId)
    .order('first_name', { ascending: true })
    .order('last_name', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createClient(kennelId: string, input: ClientMutationInput): Promise<Client> {
  const supabase = getSupabaseClient();
  const payload: ClientInsert = {
    kennel_id: kennelId,
    ...input,
  };

  const { data, error } = await supabase.from('clients').insert(payload).select().single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateClient(
  kennelId: string,
  clientId: string,
  input: ClientMutationInput,
): Promise<Client> {
  const supabase = getSupabaseClient();
  const payload: ClientUpdate = {
    ...input,
  };

  const { data, error } = await supabase
    .from('clients')
    .update(payload)
    .eq('id', clientId)
    .eq('kennel_id', kennelId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteClient(kennelId: string, clientId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('clients').delete().eq('id', clientId).eq('kennel_id', kennelId);

  if (error) {
    throw error;
  }
}
