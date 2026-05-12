export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type KennelRole = 'owner' | 'member';
export type DogSex = 'unknown' | 'male' | 'female';
export type LitterStatus = 'planned' | 'expected' | 'born' | 'archived';
export type PuppySex = 'unknown' | 'male' | 'female';
export type PuppyStatus = 'available' | 'reserved' | 'placed' | 'kept' | 'deceased';
export type ReservationStatus = 'pending' | 'reserved' | 'paid' | 'cancelled' | 'completed';

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
          name: string;
          sex: PuppySex;
          color: string | null;
          birth_weight: number | null;
          status: PuppyStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kennel_id: string;
          litter_id: string;
          name: string;
          sex?: PuppySex;
          color?: string | null;
          birth_weight?: number | null;
          status?: PuppyStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kennel_id?: string;
          litter_id?: string;
          name?: string;
          sex?: PuppySex;
          color?: string | null;
          birth_weight?: number | null;
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
        ];
      };
      reservations: {
        Row: {
          id: string;
          kennel_id: string;
          puppy_id: string;
          client_id: string;
          litter_id: string | null;
          status: ReservationStatus;
          reserved_price: number | null;
          deposit_amount: number | null;
          deposit_paid: boolean;
          reservation_date: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kennel_id: string;
          puppy_id: string;
          client_id: string;
          litter_id?: string | null;
          status?: ReservationStatus;
          reserved_price?: number | null;
          deposit_amount?: number | null;
          deposit_paid?: boolean;
          reservation_date?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kennel_id?: string;
          puppy_id?: string;
          client_id?: string;
          litter_id?: string | null;
          status?: ReservationStatus;
          reserved_price?: number | null;
          deposit_amount?: number | null;
          deposit_paid?: boolean;
          reservation_date?: string;
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
          {
            foreignKeyName: 'reservations_litter_id_fkey';
            columns: ['litter_id'];
            referencedRelation: 'litters';
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
