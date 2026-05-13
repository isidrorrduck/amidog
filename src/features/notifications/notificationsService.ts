import { getSupabaseClient } from '../../lib/supabase';
import type { Database } from '../../types/database';
import type { KennelNotification, PushTokenRegistrationInput } from './types';

type PushTokenInsert = Database['public']['Tables']['push_tokens']['Insert'];

export async function listNotifications(kennelId: string): Promise<KennelNotification[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('kennel_id', kennelId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getUnreadNotificationsCount(kennelId: string): Promise<number> {
  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('kennel_id', kennelId)
    .is('read_at', null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function markNotificationRead(kennelId: string, notificationId: string): Promise<KennelNotification> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('kennel_id', kennelId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function registerPushToken(input: PushTokenRegistrationInput): Promise<void> {
  const supabase = getSupabaseClient();
  const payload: PushTokenInsert = {
    user_id: input.user_id,
    kennel_id: input.kennel_id,
    expo_push_token: input.expo_push_token,
    platform: input.platform,
  };
  const { error } = await supabase.from('push_tokens').upsert(payload, {
    onConflict: 'user_id,kennel_id,expo_push_token',
  });

  if (error) {
    throw error;
  }
}
