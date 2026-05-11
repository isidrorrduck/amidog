export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type KennelRole = 'owner' | 'admin' | 'member';

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
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'kennels_owner_id_fkey';
            columns: ['owner_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      kennel_memberships: {
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
            foreignKeyName: 'kennel_memberships_kennel_id_fkey';
            columns: ['kennel_id'];
            referencedRelation: 'kennels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'kennel_memberships_profile_id_fkey';
            columns: ['profile_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
