import { getSupabaseClient } from '../../lib/supabase';
import type { Database } from '../../types/database';
import type { Promotion, PromotionFilters, PromotionMutationInput } from './types';

type PromotionInsert = Database['public']['Tables']['promotions']['Insert'];
type PromotionUpdate = Database['public']['Tables']['promotions']['Update'];

export async function listPromotions(
  kennelId: string,
  filters: PromotionFilters = {},
): Promise<Promotion[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('promotions')
    .select('*')
    .or(`is_global.eq.true,kennel_id.eq.${kennelId}`)
    .order('created_at', { ascending: false })
    .order('title', { ascending: true });

  if (filters.promotionType) {
    query = query.eq('promotion_type', filters.promotionType);
  }

  if (filters.scope === 'global') {
    query = query.eq('is_global', true);
  } else if (filters.scope === 'kennel') {
    query = query.eq('is_global', false).eq('kennel_id', kennelId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getPromotion(kennelId: string, promotionId: string): Promise<Promotion> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('id', promotionId)
    .or(`is_global.eq.true,kennel_id.eq.${kennelId}`)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function createPromotion(
  kennelId: string,
  input: PromotionMutationInput,
): Promise<Promotion> {
  const supabase = getSupabaseClient();
  const payload: PromotionInsert = {
    kennel_id: input.is_global ? null : kennelId,
    title: input.title,
    message: input.message,
    image_url: input.image_url,
    action_url: input.action_url,
    promotion_type: input.promotion_type,
    is_global: input.is_global,
  };

  const { data, error } = await supabase.from('promotions').insert(payload).select().single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updatePromotion(
  kennelId: string,
  promotionId: string,
  input: PromotionMutationInput,
): Promise<Promotion> {
  const supabase = getSupabaseClient();
  const payload: PromotionUpdate = {
    kennel_id: input.is_global ? null : kennelId,
    title: input.title,
    message: input.message,
    image_url: input.image_url,
    action_url: input.action_url,
    promotion_type: input.promotion_type,
    is_global: input.is_global,
  };

  const { data, error } = await supabase
    .from('promotions')
    .update(payload)
    .eq('id', promotionId)
    .eq('kennel_id', kennelId)
    .eq('is_global', false)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deletePromotion(kennelId: string, promotionId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('promotions')
    .delete()
    .eq('id', promotionId)
    .eq('kennel_id', kennelId)
    .eq('is_global', false);

  if (error) {
    throw error;
  }
}
