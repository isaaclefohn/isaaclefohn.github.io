// Generated from the Supabase project `chroma-drop` (mqngqpgjzuyhxlbnixyt).
// Do not edit by hand — regenerate after schema changes via the Supabase MCP
// (generate_typescript_types) or `supabase gen types typescript`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      daily_challenge_results: {
        Row: {
          challenge_date: string
          completed: boolean
          created_at: string
          id: string
          score: number
          user_id: string
        }
        Insert: {
          challenge_date: string
          completed?: boolean
          created_at?: string
          id?: string
          score: number
          user_id: string
        }
        Update: {
          challenge_date?: string
          completed?: boolean
          created_at?: string
          id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_challenge_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          acquired_at: string
          equipped: boolean
          id: string
          item_id: string
          item_type: string
          quantity: number
          user_id: string
        }
        Insert: {
          acquired_at?: string
          equipped?: boolean
          id?: string
          item_id: string
          item_type: string
          quantity?: number
          user_id: string
        }
        Update: {
          acquired_at?: string
          equipped?: boolean
          id?: string
          item_id?: string
          item_type?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      level_progress: {
        Row: {
          completed_at: string
          high_score: number
          id: string
          level_number: number
          moves_used: number | null
          stars: number
          time_seconds: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          high_score?: number
          id?: string
          level_number: number
          moves_used?: number | null
          stars: number
          time_seconds?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string
          high_score?: number
          id?: string
          level_number?: number
          moves_used?: number | null
          stars?: number
          time_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "level_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ad_free: boolean
          avatar_id: string
          coins: number
          created_at: string
          current_streak: number
          display_name: string
          gems: number
          highest_level: number
          id: string
          last_daily_claim: string | null
          longest_streak: number
          total_score: number
          updated_at: string
        }
        Insert: {
          ad_free?: boolean
          avatar_id?: string
          coins?: number
          created_at?: string
          current_streak?: number
          display_name?: string
          gems?: number
          highest_level?: number
          id: string
          last_daily_claim?: string | null
          longest_streak?: number
          total_score?: number
          updated_at?: string
        }
        Update: {
          ad_free?: boolean
          avatar_id?: string
          coins?: number
          created_at?: string
          current_streak?: number
          display_name?: string
          gems?: number
          highest_level?: number
          id?: string
          last_daily_claim?: string | null
          longest_streak?: number
          total_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          platform: string
          product_id: string
          receipt_data: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          platform: string
          product_id: string
          receipt_data?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          platform?: string
          product_id?: string
          receipt_data?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
