// Regenerate with npm run gen:types; hand-written from migrations 0001–0007 on 2026-09-17,
// rate_limits / rate_limit_hit added by hand from 0008 on 2026-09-18, user_state by hand
// from 0009 on 2026-09-19, content_changelog by hand from 0010 on 2026-09-20,
// content_contacts / content_sops by hand from 0011 / 0012 on 2026-09-20
// (Supabase CLI unavailable locally: SUPABASE_PROJECT_ID unset).
//
// allowed_users (full_name, is_active, created_at, updated_at, updated_by) and
// content_versions (op) added by hand from 0013 on 2026-09-22 — run
// `npm run gen:types` once 0013 is applied to confirm them against the project.
//
// allowed_users and telemetry_events were created by hand before
// supabase/migrations existed; 0013_baseline_and_audit_integrity.sql is their
// baseline. The columns below are the shape that migration declares:
// allowed_users from 0001_custom_access_token_hook.sql (email, role) plus 0013's
// bookkeeping columns, telemetry_events from app/api/events/route.ts (insert)
// and lib/telemetry/aggregate.ts (TelemetryRow).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          actor: string | null
          body: string | null
          created_at: string
          href: string | null
          id: number
          kind: string
          read_at: string | null
          row_id: string | null
          severity: string
          table_name: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actor?: string | null
          body?: string | null
          created_at?: string
          href?: string | null
          id?: number
          kind: string
          read_at?: string | null
          row_id?: string | null
          severity: string
          table_name?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actor?: string | null
          body?: string | null
          created_at?: string
          href?: string | null
          id?: number
          kind?: string
          read_at?: string | null
          row_id?: string | null
          severity?: string
          table_name?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      allowed_users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          is_active: boolean
          role: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          is_active?: boolean
          role: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          is_active?: boolean
          role?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      copilot_logs: {
        Row: {
          answer_chars: number | null
          email: string | null
          finish_reason: string | null
          hit_ids: string[] | null
          id: number
          latency_ms: number | null
          locale: string | null
          model: string | null
          question: string | null
          status: string
          ts: string
        }
        Insert: {
          answer_chars?: number | null
          email?: string | null
          finish_reason?: string | null
          hit_ids?: string[] | null
          id?: number
          latency_ms?: number | null
          locale?: string | null
          model?: string | null
          question?: string | null
          status: string
          ts?: string
        }
        Update: {
          answer_chars?: number | null
          email?: string | null
          finish_reason?: string | null
          hit_ids?: string[] | null
          id?: number
          latency_ms?: number | null
          locale?: string | null
          model?: string | null
          question?: string | null
          status?: string
          ts?: string
        }
        Relationships: []
      }
      content_changelog: {
        Row: {
          approved_by: string
          body: string
          body_ru: string | null
          created_at: string
          id: string
          linked_path: string | null
          published_on: string
          sort_order: number
          status: string
          title: string
          title_ru: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          approved_by: string
          body: string
          body_ru?: string | null
          created_at?: string
          id: string
          linked_path?: string | null
          published_on: string
          sort_order?: number
          status?: string
          title: string
          title_ru?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          approved_by?: string
          body?: string
          body_ru?: string | null
          created_at?: string
          id?: string
          linked_path?: string | null
          published_on?: string
          sort_order?: number
          status?: string
          title?: string
          title_ru?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      content_competitors: {
        Row: {
          assortment: string | null
          base_discount: string | null
          certificates: string | null
          created_at: string
          dealer_coverage: string | null
          delivery_time: string | null
          id: string
          logistics: string | null
          marketing_offers: string | null
          max_discount: string | null
          name: string
          payment_method: string | null
          payment_terms: string | null
          retro_bonus: string | null
          sort_order: number
          status: string
          threat_level: string
          updated_at: string
          updated_by: string | null
          version: number
          volume_discount: string | null
        }
        Insert: {
          assortment?: string | null
          base_discount?: string | null
          certificates?: string | null
          created_at?: string
          dealer_coverage?: string | null
          delivery_time?: string | null
          id: string
          logistics?: string | null
          marketing_offers?: string | null
          max_discount?: string | null
          name: string
          payment_method?: string | null
          payment_terms?: string | null
          retro_bonus?: string | null
          sort_order?: number
          status?: string
          threat_level: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          volume_discount?: string | null
        }
        Update: {
          assortment?: string | null
          base_discount?: string | null
          certificates?: string | null
          created_at?: string
          dealer_coverage?: string | null
          delivery_time?: string | null
          id?: string
          logistics?: string | null
          marketing_offers?: string | null
          max_discount?: string | null
          name?: string
          payment_method?: string | null
          payment_terms?: string | null
          retro_bonus?: string | null
          sort_order?: number
          status?: string
          threat_level?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          volume_discount?: string | null
        }
        Relationships: []
      }
      content_contacts: {
        Row: {
          created_at: string
          id: string
          messenger: string
          name: string
          phone: string
          role: string
          role_ru: string | null
          sort_order: number
          status: string
          topic: string
          topic_ru: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          id: string
          messenger: string
          name: string
          phone: string
          role: string
          role_ru?: string | null
          sort_order?: number
          status?: string
          topic: string
          topic_ru?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          messenger?: string
          name?: string
          phone?: string
          role?: string
          role_ru?: string | null
          sort_order?: number
          status?: string
          topic?: string
          topic_ru?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      content_faqs: {
        Row: {
          answer: string
          answer_ru: string | null
          category: string
          created_at: string
          id: string
          question: string
          question_ru: string | null
          sort_order: number
          status: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          answer: string
          answer_ru?: string | null
          category: string
          created_at?: string
          id: string
          question: string
          question_ru?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          answer?: string
          answer_ru?: string | null
          category?: string
          created_at?: string
          id?: string
          question?: string
          question_ru?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      content_gate_reports: {
        Row: {
          actor: string | null
          created_at: string
          id: number
          issues: Json
          passed: boolean
          row_id: string
          table_name: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          id?: number
          issues?: Json
          passed: boolean
          row_id: string
          table_name: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          id?: number
          issues?: Json
          passed?: boolean
          row_id?: string
          table_name?: string
        }
        Relationships: []
      }
      content_objections: {
        Row: {
          client_says: string
          client_says_ru: string | null
          created_at: string
          follow_up: string | null
          follow_up_ru: string | null
          id: string
          keywords: string[]
          label: string
          label_ru: string | null
          real_meaning: string
          real_meaning_ru: string | null
          response: string
          response_ru: string | null
          script_ids: string[]
          sort_order: number
          status: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          client_says: string
          client_says_ru?: string | null
          created_at?: string
          follow_up?: string | null
          follow_up_ru?: string | null
          id: string
          keywords?: string[]
          label: string
          label_ru?: string | null
          real_meaning: string
          real_meaning_ru?: string | null
          response: string
          response_ru?: string | null
          script_ids?: string[]
          sort_order?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          client_says?: string
          client_says_ru?: string | null
          created_at?: string
          follow_up?: string | null
          follow_up_ru?: string | null
          id?: string
          keywords?: string[]
          label?: string
          label_ru?: string | null
          real_meaning?: string
          real_meaning_ru?: string | null
          response?: string
          response_ru?: string | null
          script_ids?: string[]
          sort_order?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      content_package_groups: {
        Row: {
          created_at: string
          id: string
          sort_order: number
          status: string
          subtitle: string
          subtitle_ru: string | null
          title: string
          title_ru: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          id: string
          sort_order?: number
          status?: string
          subtitle: string
          subtitle_ru?: string | null
          title: string
          title_ru?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          sort_order?: number
          status?: string
          subtitle?: string
          subtitle_ru?: string | null
          title?: string
          title_ru?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      content_packages: {
        Row: {
          advance_pct: number | null
          created_at: string
          delivery_time: string
          delivery_time_ru: string | null
          discount_pct: number
          estimated_discount: string
          estimated_discount_ru: string | null
          group_id: string
          id: string
          is_featured: boolean
          logistics: string
          logistics_ru: string | null
          name: string
          name_ru: string | null
          order_volume: string
          order_volume_ru: string | null
          payment_terms: string
          payment_terms_ru: string | null
          sort_order: number
          status: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          advance_pct?: number | null
          created_at?: string
          delivery_time: string
          delivery_time_ru?: string | null
          discount_pct?: number
          estimated_discount: string
          estimated_discount_ru?: string | null
          group_id: string
          id: string
          is_featured?: boolean
          logistics: string
          logistics_ru?: string | null
          name: string
          name_ru?: string | null
          order_volume: string
          order_volume_ru?: string | null
          payment_terms: string
          payment_terms_ru?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          advance_pct?: number | null
          created_at?: string
          delivery_time?: string
          delivery_time_ru?: string | null
          discount_pct?: number
          estimated_discount?: string
          estimated_discount_ru?: string | null
          group_id?: string
          id?: string
          is_featured?: boolean
          logistics?: string
          logistics_ru?: string | null
          name?: string
          name_ru?: string | null
          order_volume?: string
          order_volume_ru?: string | null
          payment_terms?: string
          payment_terms_ru?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_packages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "content_package_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      content_products: {
        Row: {
          category: string
          created_at: string
          filename: string
          id: string
          line: string
          material: string | null
          name_ru: string
          name_uz: string | null
          sizes: string[]
          sort_order: number
          status: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          category: string
          created_at?: string
          filename: string
          id: string
          line: string
          material?: string | null
          name_ru: string
          name_uz?: string | null
          sizes?: string[]
          sort_order?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          category?: string
          created_at?: string
          filename?: string
          id?: string
          line?: string
          material?: string | null
          name_ru?: string
          name_uz?: string | null
          sizes?: string[]
          sort_order?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      content_scripts: {
        Row: {
          cheat_sheet: string
          cheat_sheet_ru: string | null
          created_at: string
          id: string
          name: string
          name_ru: string | null
          sort_order: number
          stages: Json
          stages_ru: Json | null
          status: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          cheat_sheet: string
          cheat_sheet_ru?: string | null
          created_at?: string
          id: string
          name: string
          name_ru?: string | null
          sort_order?: number
          stages?: Json
          stages_ru?: Json | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          cheat_sheet?: string
          cheat_sheet_ru?: string | null
          created_at?: string
          id?: string
          name?: string
          name_ru?: string | null
          sort_order?: number
          stages?: Json
          stages_ru?: Json | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      content_sops: {
        Row: {
          created_at: string
          id: string
          sort_order: number
          status: string
          steps: Json
          steps_ru: Json | null
          summary: string
          summary_ru: string | null
          title: string
          title_ru: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          id: string
          sort_order?: number
          status?: string
          steps?: Json
          steps_ru?: Json | null
          summary?: string
          summary_ru?: string | null
          title: string
          title_ru?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          sort_order?: number
          status?: string
          steps?: Json
          steps_ru?: Json | null
          summary?: string
          summary_ru?: string | null
          title?: string
          title_ru?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      content_versions: {
        Row: {
          actor: string | null
          created_at: string
          id: number
          op: string
          row_id: string
          snapshot: Json
          table_name: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          id?: number
          op?: string
          row_id: string
          snapshot: Json
          table_name: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          id?: number
          op?: string
          row_id?: string
          snapshot?: Json
          table_name?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          expires_at: string
          hits: number
          key: string
          updated_at: string
          window_start: string
        }
        Insert: {
          expires_at: string
          hits: number
          key: string
          updated_at?: string
          window_start: string
        }
        Update: {
          expires_at?: string
          hits?: number
          key?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      telemetry_events: {
        Row: {
          created_at: string
          duration_ms: number | null
          entity_id: string | null
          entity_type: string | null
          id: number
          meta: Json | null
          path: string
          session_id: string
          ts: string
          type: string
          user_email: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          meta?: Json | null
          path: string
          session_id: string
          ts: string
          type: string
          user_email: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          meta?: Json | null
          path?: string
          session_id?: string
          ts?: string
          type?: string
          user_email?: string
        }
        Relationships: []
      }
      user_state: {
        Row: {
          key: string
          updated_at: string
          user_email: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          user_email?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          user_email?: string
          value?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      custom_access_token_hook: {
        Args: { event: Json }
        Returns: Json
      }
      rate_limit_hit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
