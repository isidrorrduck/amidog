export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type KennelRole = 'owner' | 'member';
export type DogSex = 'unknown' | 'male' | 'female';

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
          email: string;
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
          profile_id: string;
          role: KennelRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          kennel_id: string;
          profile_id: string;
          role?: KennelRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          kennel_id?: string;
          profile_id?: string;
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
