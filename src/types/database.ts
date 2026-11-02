export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      inspections: {
        Row: { brake_discs: string; brake_fluid: string; brake_pads: string; created_at: string; id: string; mechanic_id: string; notes: string; request_id: string; updated_at: string };
        Insert: { brake_discs: string; brake_fluid: string; brake_pads: string; created_at?: string; id?: string; mechanic_id: string; notes?: string; request_id: string; updated_at?: string };
        Update: { brake_discs?: string; brake_fluid?: string; brake_pads?: string; created_at?: string; id?: string; mechanic_id?: string; notes?: string; request_id?: string; updated_at?: string };
        Relationships: [];
      };
      mechanic_profiles: {
        Row: { created_at: string; garage_name: string; location: string; rating: number; reviews_count: number; services: string[]; updated_at: string; user_id: string; verified: boolean };
        Insert: { created_at?: string; garage_name?: string; location?: string; rating?: number; reviews_count?: number; services?: string[]; updated_at?: string; user_id: string; verified?: boolean };
        Update: { created_at?: string; garage_name?: string; location?: string; rating?: number; reviews_count?: number; services?: string[]; updated_at?: string; user_id?: string; verified?: boolean };
        Relationships: [];
      };
      profiles: {
        Row: { created_at: string; full_name: string; id: string; phone: string; role: string; updated_at: string };
        Insert: { created_at?: string; full_name?: string; id: string; phone?: string; role?: string; updated_at?: string };
        Update: { created_at?: string; full_name?: string; id?: string; phone?: string; role?: string; updated_at?: string };
        Relationships: [];
      };
      ratings: {
        Row: { created_at: string; id: string; mechanic_id: string; motorist_id: string; rating: number; request_id: string; review: string | null };
        Insert: { created_at?: string; id?: string; mechanic_id: string; motorist_id: string; rating: number; request_id: string; review?: string | null };
        Update: { created_at?: string; id?: string; mechanic_id?: string; motorist_id?: string; rating?: number; request_id?: string; review?: string | null };
        Relationships: [];
      };
      repair_events: {
        Row: { actor_id: string | null; created_at: string; id: number; note: string | null; request_id: string; status: string };
        Insert: { actor_id?: string | null; created_at?: string; id?: number; note?: string | null; request_id: string; status: string };
        Update: { actor_id?: string | null; created_at?: string; id?: number; note?: string | null; request_id?: string; status?: string };
        Relationships: [];
      };
      repair_quotes: {
        Row: { created_at: string; id: string; labour_amount: number; labour_description: string; mechanic_id: string; part_amount: number; part_description: string; request_id: string; service_fee: number; total: number | null; updated_at: string };
        Insert: { created_at?: string; id?: string; labour_amount: number; labour_description: string; mechanic_id: string; part_amount?: number; part_description?: string; request_id: string; service_fee?: number; total?: number | null; updated_at?: string };
        Update: { created_at?: string; id?: string; labour_amount?: number; labour_description?: string; mechanic_id?: string; part_amount?: number; part_description?: string; request_id?: string; service_fee?: number; total?: number | null; updated_at?: string };
        Relationships: [];
      };
      repair_requests: {
        Row: { created_at: string; description: string; id: string; latitude: number | null; location_text: string; longitude: number | null; mechanic_id: string; motorist_id: string; preferred_time: string; status: string; submitted_at: string; symptom: string; updated_at: string; vehicle_id: string };
        Insert: { created_at?: string; description: string; id?: string; latitude?: number | null; location_text: string; longitude?: number | null; mechanic_id: string; motorist_id: string; preferred_time?: string; status?: string; submitted_at?: string; symptom: string; updated_at?: string; vehicle_id: string };
        Update: { created_at?: string; description?: string; id?: string; latitude?: number | null; location_text?: string; longitude?: number | null; mechanic_id?: string; motorist_id?: string; preferred_time?: string; status?: string; submitted_at?: string; symptom?: string; updated_at?: string; vehicle_id?: string };
        Relationships: [];
      };
      vehicles: {
        Row: { created_at: string; id: string; make: string; model: string; owner_id: string; power_source: string; registration: string; transmission: string; updated_at: string; year: number };
        Insert: { created_at?: string; id?: string; make: string; model: string; owner_id: string; power_source: string; registration: string; transmission: string; updated_at?: string; year: number };
        Update: { created_at?: string; id?: string; make?: string; model?: string; owner_id?: string; power_source?: string; registration?: string; transmission?: string; updated_at?: string; year?: number };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type MechanicProfileRow = Database["public"]["Tables"]["mechanic_profiles"]["Row"];
export type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];
export type RepairRequestRow = Database["public"]["Tables"]["repair_requests"]["Row"];
export type InspectionRow = Database["public"]["Tables"]["inspections"]["Row"];
export type RepairQuoteRow = Database["public"]["Tables"]["repair_quotes"]["Row"];
export type RatingRow = Database["public"]["Tables"]["ratings"]["Row"];
