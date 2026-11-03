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
      connection_payments: {
        Row: { amount: number; checkout_request_id: string | null; created_at: string; currency: string; failed_at: string | null; id: string; initiated_at: string; mechanic_id: string; merchant_request_id: string | null; motorist_id: string; mpesa_receipt_number: string | null; paid_at: string | null; phone: string | null; provider: string; provider_result_code: string | null; provider_result_message: string | null; refunded_at: string | null; request_id: string; status: string; updated_at: string };
        Insert: { amount?: number; checkout_request_id?: string | null; created_at?: string; currency?: string; failed_at?: string | null; id?: string; initiated_at?: string; mechanic_id: string; merchant_request_id?: string | null; motorist_id: string; mpesa_receipt_number?: string | null; paid_at?: string | null; phone?: string | null; provider?: string; provider_result_code?: string | null; provider_result_message?: string | null; refunded_at?: string | null; request_id: string; status?: string; updated_at?: string };
        Update: { amount?: number; checkout_request_id?: string | null; created_at?: string; currency?: string; failed_at?: string | null; id?: string; initiated_at?: string; mechanic_id?: string; merchant_request_id?: string | null; motorist_id?: string; mpesa_receipt_number?: string | null; paid_at?: string | null; phone?: string | null; provider?: string; provider_result_code?: string | null; provider_result_message?: string | null; refunded_at?: string | null; request_id?: string; status?: string; updated_at?: string };
        Relationships: [];
      };
      device_push_tokens: {
        Row: { created_at: string; device_name: string | null; enabled: boolean; expo_push_token: string; id: string; last_seen_at: string; platform: string; updated_at: string; user_id: string };
        Insert: { created_at?: string; device_name?: string | null; enabled?: boolean; expo_push_token: string; id?: string; last_seen_at?: string; platform?: string; updated_at?: string; user_id: string };
        Update: { created_at?: string; device_name?: string | null; enabled?: boolean; expo_push_token?: string; id?: string; last_seen_at?: string; platform?: string; updated_at?: string; user_id?: string };
        Relationships: [];
      };
      inspections: {
        Row: { brake_discs: string; brake_fluid: string; brake_pads: string; created_at: string; id: string; mechanic_id: string; notes: string; request_id: string; updated_at: string };
        Insert: { brake_discs: string; brake_fluid: string; brake_pads: string; created_at?: string; id?: string; mechanic_id: string; notes?: string; request_id: string; updated_at?: string };
        Update: { brake_discs?: string; brake_fluid?: string; brake_pads?: string; created_at?: string; id?: string; mechanic_id?: string; notes?: string; request_id?: string; updated_at?: string };
        Relationships: [];
      };
      mechanic_offers: {
        Row: { created_at: string; distance_km: number | null; expires_at: string; id: string; match_score: number; mechanic_id: string; rank: number; request_id: string; responded_at: string | null; status: string; updated_at: string };
        Insert: { created_at?: string; distance_km?: number | null; expires_at?: string; id?: string; match_score?: number; mechanic_id: string; rank?: number; request_id: string; responded_at?: string | null; status?: string; updated_at?: string };
        Update: { created_at?: string; distance_km?: number | null; expires_at?: string; id?: string; match_score?: number; mechanic_id?: string; rank?: number; request_id?: string; responded_at?: string | null; status?: string; updated_at?: string };
        Relationships: [];
      };
      mechanic_profiles: {
        Row: { accepted_offers: number; availability_updated_at: string | null; completed_jobs: number; created_at: string; declined_offers: number; expired_offers: number; garage_name: string; is_available: boolean; last_active_at: string | null; latitude: number | null; location: string; location_updated_at: string | null; longitude: number | null; provider_type: string; rating: number; reviews_count: number; services: string[]; updated_at: string; user_id: string; verified: boolean };
        Insert: { accepted_offers?: number; availability_updated_at?: string | null; completed_jobs?: number; created_at?: string; declined_offers?: number; expired_offers?: number; garage_name?: string; is_available?: boolean; last_active_at?: string | null; latitude?: number | null; location?: string; location_updated_at?: string | null; longitude?: number | null; provider_type?: string; rating?: number; reviews_count?: number; services?: string[]; updated_at?: string; user_id: string; verified?: boolean };
        Update: { accepted_offers?: number; availability_updated_at?: string | null; completed_jobs?: number; created_at?: string; declined_offers?: number; expired_offers?: number; garage_name?: string; is_available?: boolean; last_active_at?: string | null; latitude?: number | null; location?: string; location_updated_at?: string | null; longitude?: number | null; provider_type?: string; rating?: number; reviews_count?: number; services?: string[]; updated_at?: string; user_id?: string; verified?: boolean };
        Relationships: [];
      };
      mechanic_verification_submissions: {
        Row: { account_name_match_review: boolean; business_permit_confirmed: boolean; business_permit_match_review: boolean; business_permit_path: string | null; certificate_paths: string[]; certificates_confirmed: boolean; certificates_valid_review: boolean; document_valid_review: boolean; id_number_match_review: boolean; identity_claimed: boolean; national_id_back_path: string | null; national_id_confirmed: boolean; national_id_front_path: string | null; national_id_path: string | null; profile_photo_confirmed: boolean; profile_photo_path: string | null; review_note: string | null; reviewed_at: string | null; selfie_match_review: boolean; selfie_path: string | null; status: string; submitted_at: string; updated_at: string; user_id: string };
        Insert: { account_name_match_review?: boolean; business_permit_confirmed?: boolean; business_permit_match_review?: boolean; business_permit_path?: string | null; certificate_paths?: string[]; certificates_confirmed?: boolean; certificates_valid_review?: boolean; document_valid_review?: boolean; id_number_match_review?: boolean; identity_claimed?: boolean; national_id_back_path?: string | null; national_id_confirmed?: boolean; national_id_front_path?: string | null; national_id_path?: string | null; profile_photo_confirmed?: boolean; profile_photo_path?: string | null; review_note?: string | null; reviewed_at?: string | null; selfie_match_review?: boolean; selfie_path?: string | null; status?: string; submitted_at?: string; updated_at?: string; user_id: string };
        Update: { account_name_match_review?: boolean; business_permit_confirmed?: boolean; business_permit_match_review?: boolean; business_permit_path?: string | null; certificate_paths?: string[]; certificates_confirmed?: boolean; certificates_valid_review?: boolean; document_valid_review?: boolean; id_number_match_review?: boolean; identity_claimed?: boolean; national_id_back_path?: string | null; national_id_confirmed?: boolean; national_id_front_path?: string | null; national_id_path?: string | null; profile_photo_confirmed?: boolean; profile_photo_path?: string | null; review_note?: string | null; reviewed_at?: string | null; selfie_match_review?: boolean; selfie_path?: string | null; status?: string; submitted_at?: string; updated_at?: string; user_id?: string };
        Relationships: [];
      };
      profiles: {
        Row: { created_at: string; full_name: string; id: string; phone: string; provider_type: string | null; role: string; updated_at: string };
        Insert: { created_at?: string; full_name?: string; id: string; phone?: string; provider_type?: string | null; role?: string; updated_at?: string };
        Update: { created_at?: string; full_name?: string; id?: string; phone?: string; provider_type?: string | null; role?: string; updated_at?: string };
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
        Row: { connection_fee_amount: number; contact_unlocked_at: string | null; created_at: string; description: string; dispatch_attempts: number; id: string; latitude: number | null; location_text: string; longitude: number | null; mechanic_id: string | null; motorist_id: string; preferred_time: string; status: string; submitted_at: string; symptom: string; updated_at: string; vehicle_id: string | null };
        Insert: { connection_fee_amount?: number; contact_unlocked_at?: string | null; created_at?: string; description: string; dispatch_attempts?: number; id?: string; latitude?: number | null; location_text: string; longitude?: number | null; mechanic_id?: string | null; motorist_id: string; preferred_time?: string; status?: string; submitted_at?: string; symptom: string; updated_at?: string; vehicle_id?: string | null };
        Update: { connection_fee_amount?: number; contact_unlocked_at?: string | null; created_at?: string; description?: string; dispatch_attempts?: number; id?: string; latitude?: number | null; location_text?: string; longitude?: number | null; mechanic_id?: string | null; motorist_id?: string; preferred_time?: string; status?: string; submitted_at?: string; symptom?: string; updated_at?: string; vehicle_id?: string | null };
        Relationships: [];
      };
      vehicles: {
        Row: { archived_at: string | null; created_at: string; fuel_type: string | null; id: string; make: string; model: string; owner_id: string; power_source: string; registration: string; transmission: string; updated_at: string; year: number };
        Insert: { archived_at?: string | null; created_at?: string; fuel_type?: string | null; id?: string; make: string; model: string; owner_id: string; power_source: string; registration: string; transmission: string; updated_at?: string; year: number };
        Update: { archived_at?: string | null; created_at?: string; fuel_type?: string | null; id?: string; make?: string; model?: string; owner_id?: string; power_source?: string; registration?: string; transmission?: string; updated_at?: string; year?: number };
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
export type MechanicVerificationRow = Database["public"]["Tables"]["mechanic_verification_submissions"]["Row"];
export type MechanicOfferRow = Database["public"]["Tables"]["mechanic_offers"]["Row"];
export type ConnectionPaymentRow = Database["public"]["Tables"]["connection_payments"]["Row"];
export type DevicePushTokenRow = Database["public"]["Tables"]["device_push_tokens"]["Row"];
export type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];
export type RepairRequestRow = Database["public"]["Tables"]["repair_requests"]["Row"];
export type InspectionRow = Database["public"]["Tables"]["inspections"]["Row"];
export type RepairQuoteRow = Database["public"]["Tables"]["repair_quotes"]["Row"];
export type RatingRow = Database["public"]["Tables"]["ratings"]["Row"];
