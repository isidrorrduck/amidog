export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type KennelRole = 'owner' | 'member';
export type DogSex = 'unknown' | 'male' | 'female';
export type LitterStatus = 'planned' | 'expected' | 'born' | 'archived';
export type PuppySex = 'unknown' | 'male' | 'female';
export type PuppyStatus = 'available' | 'reserved' | 'sold' | 'keeper' | 'deceased';
export type DocumentEntityType = 'dog' | 'puppy' | 'litter' | 'client';
export type DocumentType =
  | 'genetic_analysis'
  | 'pedigree'
  | 'contract'
  | 'vaccine_record'
  | 'veterinary_report'
  | 'recommendation'
  | 'other';
export type HealthEventType =
  | 'vaccine'
  | 'deworming'
  | 'weight'
  | 'vet_visit'
  | 'medication'
  | 'pregnancy_check'
  | 'birth'
  | 'other';
export type PromotionType =
  | 'veterinary'
  | 'nutrition'
  | 'genetics'
  | 'supplements'
  | 'grooming'
  | 'kennel'
  | 'puppies'
  | 'other';
export type PushTokenPlatform = 'ios' | 'android' | 'web' | 'windows' | 'macos' | 'unknown';
export type ReservationStatus = 'pending' | 'paid' | 'cancelled' | 'completed';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      kennels: {
        Row: {
          id: string;
          name: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'kennels_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      kennel_members: {
        Row: {
          id: string;
          kennel_id: string;
          profile_id?: string;
          user_id?: string;
          role: KennelRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          kennel_id: string;
          profile_id?: string;
          user_id?: string;
          role?: KennelRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          kennel_id?: string;
          profile_id?: string;
          user_id?: string;
          role?: KennelRole;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'kennel_members_kennel_id_fkey';
            columns: ['kennel_id'];
            referencedRelation: 'kennels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'kennel_members_profile_id_fkey';
            columns: ['profile_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      dogs: {
        Row: {
          id: string;
          kennel_id: string;
          name: string;
          breed: string | null;
          sex: DogSex;
          birth_date: string | null;
          color: string | null;
          microchip_number: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kennel_id: string;
          name: string;
          breed?: string | null;
          sex?: DogSex;
          birth_date?: string | null;
          color?: string | null;
          microchip_number?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kennel_id?: string;
          name?: string;
          breed?: string | null;
          sex?: DogSex;
          birth_date?: string | null;
          color?: string | null;
          microchip_number?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'dogs_kennel_id_fkey';
            columns: ['kennel_id'];
            referencedRelation: 'kennels';
            referencedColumns: ['id'];
          },
        ];
      };
      clients: {
        Row: {
          id: string;
          kennel_id: string;
          first_name: string;
          last_name: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          city: string | null;
          country: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kennel_id: string;
          first_name: string;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kennel_id?: string;
          first_name?: string;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'clients_kennel_id_fkey';
            columns: ['kennel_id'];
            referencedRelation: 'kennels';
            referencedColumns: ['id'];
          },
        ];
      };
      documents: {
        Row: {
          id: string;
          kennel_id: string;
          entity_type: DocumentEntityType;
          entity_id: string;
          title: string;
          document_type: DocumentType;
          file_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kennel_id: string;
          entity_type: DocumentEntityType;
          entity_id: string;
          title: string;
          document_type?: DocumentType;
          file_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kennel_id?: string;
          entity_type?: DocumentEntityType;
          entity_id?: string;
          title?: string;
          document_type?: DocumentType;
          file_path?: string;
          file_name?: string;
          mime_type?: string;
          size_bytes?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_kennel_id_fkey';
            columns: ['kennel_id'];
            referencedRelation: 'kennels';
            referencedColumns: ['id'];
          },
        ];
      };
      health_events: {
        Row: {
          id: string;
          kennel_id: string;
          dog_id: string | null;
          puppy_id: string | null;
          event_type: HealthEventType;
          event_date: string;
          title: string;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kennel_id: string;
          dog_id?: string | null;
          puppy_id?: string | null;
          event_type: HealthEventType;
          event_date: string;
          title: string;
          notes?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kennel_id?: string;
          dog_id?: string | null;
          puppy_id?: string | null;
          event_type?: HealthEventType;
          event_date?: string;
          title?: string;
          notes?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'health_events_kennel_id_fkey';
            columns: ['kennel_id'];
            referencedRelation: 'kennels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'health_events_dog_id_fkey';
            columns: ['dog_id'];
            referencedRelation: 'dogs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'health_events_puppy_id_fkey';
            columns: ['puppy_id'];
            referencedRelation: 'puppies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'health_events_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      promotions: {
        Row: {
          id: string;
          kennel_id: string | null;
          title: string;
          message: string;
          image_url: string | null;
          action_url: string | null;
          promotion_type: PromotionType;
          is_global: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kennel_id?: string | null;
          title: string;
          message: string;
          image_url?: string | null;
          action_url?: string | null;
          promotion_type?: PromotionType;
          is_global?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kennel_id?: string | null;
          title?: string;
          message?: string;
          image_url?: string | null;
          action_url?: string | null;
          promotion_type?: PromotionType;
          is_global?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'promotions_kennel_id_fkey';
            columns: ['kennel_id'];
            referencedRelation: 'kennels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'promotions_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          kennel_id: string;
          client_id: string | null;
          promotion_id: string | null;
          title: string;
          body: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          kennel_id: string;
          client_id?: string | null;
          promotion_id?: string | null;
          title: string;
          body: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          kennel_id?: string;
          client_id?: string | null;
          promotion_id?: string | null;
          title?: string;
          body?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_kennel_id_fkey';
            columns: ['kennel_id'];
            referencedRelation: 'kennels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_client_id_fkey';
            columns: ['client_id'];
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_promotion_id_fkey';
            columns: ['promotion_id'];
            referencedRelation: 'promotions';
            referencedColumns: ['id'];
          },
        ];
      };
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          kennel_id: string;
          expo_push_token: string;
          platform: PushTokenPlatform;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kennel_id: string;
          expo_push_token: string;
          platform?: PushTokenPlatform;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          kennel_id?: string;
          expo_push_token?: string;
          platform?: PushTokenPlatform;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_tokens_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'push_tokens_kennel_id_fkey';
            columns: ['kennel_id'];
            referencedRelation: 'kennels';
            referencedColumns: ['id'];
          },
        ];
      };
      litters: {
        Row: {
          id: string;
          kennel_id: string;
          name: string;
          mother_id: string | null;
          father_id: string | null;
          birth_date: string | null;
          expected_birth_date: string | null;
          status: LitterStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kennel_id: string;
          name: string;
          mother_id?: string | null;
          father_id?: string | null;
          birth_date?: string | null;
          expected_birth_date?: string | null;
          status?: LitterStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kennel_id?: string;
          name?: string;
          mother_id?: string | null;
          father_id?: string | null;
          birth_date?: string | null;
          expected_birth_date?: string | null;
          status?: LitterStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'litters_kennel_id_fkey';
            columns: ['kennel_id'];
            referencedRelation: 'kennels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'litters_mother_id_fkey';
            columns: ['mother_id'];
            referencedRelation: 'dogs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'litters_father_id_fkey';
            columns: ['father_id'];
            referencedRelation: 'dogs';
            referencedColumns: ['id'];
          },
        ];
      };
      puppies: {
        Row: {
          id: string;
          kennel_id: string;
          litter_id: string;
          client_id: string | null;
          name: string;
          sex: PuppySex;
          birth_date: string | null;
          color: string | null;
          birth_weight: number | null;
          photo_url: string | null;
          status: PuppyStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kennel_id: string;
          litter_id: string;
          client_id?: string | null;
          name: string;
          sex?: PuppySex;
          birth_date?: string | null;
          color?: string | null;
          birth_weight?: number | null;
          photo_url?: string | null;
          status?: PuppyStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kennel_id?: string;
          litter_id?: string;
          client_id?: string | null;
          name?: string;
          sex?: PuppySex;
          birth_date?: string | null;
          color?: string | null;
          birth_weight?: number | null;
          photo_url?: string | null;
          status?: PuppyStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'puppies_kennel_id_fkey';
            columns: ['kennel_id'];
            referencedRelation: 'kennels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'puppies_litter_id_fkey';
            columns: ['litter_id'];
            referencedRelation: 'litters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'puppies_client_id_fkey';
            columns: ['client_id'];
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      reservations: {
        Row: {
          id: string;
          kennel_id: string;
          puppy_id: string;
          client_id: string;
          status: ReservationStatus;
          reservation_date: string;
          deposit_amount: number | null;
          final_price: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kennel_id: string;
          puppy_id: string;
          client_id: string;
          status?: ReservationStatus;
          reservation_date?: string;
          deposit_amount?: number | null;
          final_price?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kennel_id?: string;
          puppy_id?: string;
          client_id?: string;
          status?: ReservationStatus;
          reservation_date?: string;
          deposit_amount?: number | null;
          final_price?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reservations_kennel_id_fkey';
            columns: ['kennel_id'];
            referencedRelation: 'kennels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_puppy_id_fkey';
            columns: ['puppy_id'];
            referencedRelation: 'puppies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_client_id_fkey';
            columns: ['client_id'];
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_kennel: {
        Args: {
          kennel_name: string;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
