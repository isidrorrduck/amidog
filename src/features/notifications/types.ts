import type { Database, PushTokenPlatform } from '../../types/database';

export type KennelNotification = Database['public']['Tables']['notifications']['Row'];
export type PushToken = Database['public']['Tables']['push_tokens']['Row'];

export interface PushTokenRegistrationInput {
  user_id: string;
  kennel_id: string;
  expo_push_token: string;
  platform: PushTokenPlatform;
}
