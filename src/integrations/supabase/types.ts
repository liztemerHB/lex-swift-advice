export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      case_messages: {
        Row: {
          case_id: string
          content: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          case_id: string
          content: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          case_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          category: string | null
          city: string | null
          consent_at: string | null
          consent_personal_data: boolean
          consent_version: string | null
          created_at: string
          estimated_damage: number | null
          facts: Json | null
          id: string
          is_fact_gathering_complete: boolean
          next_steps: Json | null
          privacy_policy_accepted: boolean
          problem_summary: string | null
          updated_at: string
          urgency: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          city?: string | null
          consent_at?: string | null
          consent_personal_data?: boolean
          consent_version?: string | null
          created_at?: string
          estimated_damage?: number | null
          facts?: Json | null
          id?: string
          is_fact_gathering_complete?: boolean
          next_steps?: Json | null
          privacy_policy_accepted?: boolean
          problem_summary?: string | null
          updated_at?: string
          urgency?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          city?: string | null
          consent_at?: string | null
          consent_personal_data?: boolean
          consent_version?: string | null
          created_at?: string
          estimated_damage?: number | null
          facts?: Json | null
          id?: string
          is_fact_gathering_complete?: boolean
          next_steps?: Json | null
          privacy_policy_accepted?: boolean
          problem_summary?: string | null
          updated_at?: string
          urgency?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      document_purchases: {
        Row: {
          case_id: string | null
          created_at: string
          document_type: string
          id: string
          price_rub: number
          title: string | null
          user_id: string
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          document_type?: string
          id?: string
          price_rub?: number
          title?: string | null
          user_id: string
        }
        Update: {
          case_id?: string | null
          created_at?: string
          document_type?: string
          id?: string
          price_rub?: number
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lead_contacts: {
        Row: {
          consent_personal_data: boolean
          consent_transfer_to_lawyer: boolean
          contact: string
          created_at: string
          id: string
          lead_id: string
          privacy_policy_accepted: boolean
        }
        Insert: {
          consent_personal_data?: boolean
          consent_transfer_to_lawyer?: boolean
          contact: string
          created_at?: string
          id?: string
          lead_id: string
          privacy_policy_accepted?: boolean
        }
        Update: {
          consent_personal_data?: boolean
          consent_transfer_to_lawyer?: boolean
          contact?: string
          created_at?: string
          id?: string
          lead_id?: string
          privacy_policy_accepted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "lead_contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_purchases: {
        Row: {
          created_at: string
          id: string
          lawyer_id: string
          lead_id: string
          price_rub: number
        }
        Insert: {
          created_at?: string
          id?: string
          lawyer_id: string
          lead_id: string
          price_rub: number
        }
        Update: {
          created_at?: string
          id?: string
          lawyer_id?: string
          lead_id?: string
          price_rub?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_purchases_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          case_id: string
          category: string | null
          city: string | null
          created_at: string
          estimated_damage: number | null
          id: string
          price_rub: number
          public_summary: string | null
          status: string
          urgency: string | null
        }
        Insert: {
          case_id: string
          category?: string | null
          city?: string | null
          created_at?: string
          estimated_damage?: number | null
          id?: string
          price_rub?: number
          public_summary?: string | null
          status?: string
          urgency?: string | null
        }
        Update: {
          case_id?: string
          category?: string | null
          city?: string | null
          created_at?: string
          estimated_damage?: number | null
          id?: string
          price_rub?: number
          public_summary?: string | null
          status?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bonus_documents: number
          bonus_messages: number
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          plan: Database["public"]["Enums"]["user_plan"]
          plan_expires_at: string | null
          referral_code: string | null
          referred_by: string | null
          updated_at: string
        }
        Insert: {
          bonus_documents?: number
          bonus_messages?: number
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          plan?: Database["public"]["Enums"]["user_plan"]
          plan_expires_at?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
        }
        Update: {
          bonus_documents?: number
          bonus_messages?: number
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["user_plan"]
          plan_expires_at?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          bonus_documents_granted: number
          bonus_messages_granted: number
          created_at: string
          id: string
          referred_user_id: string
          referrer_id: string
        }
        Insert: {
          bonus_documents_granted?: number
          bonus_messages_granted?: number
          created_at?: string
          id?: string
          referred_user_id: string
          referrer_id: string
        }
        Update: {
          bonus_documents_granted?: number
          bonus_messages_granted?: number
          created_at?: string
          id?: string
          referred_user_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      telegram_bot_state: {
        Row: {
          id: number
          update_offset: number
          updated_at: string
        }
        Insert: {
          id: number
          update_offset?: number
          updated_at?: string
        }
        Update: {
          id?: number
          update_offset?: number
          updated_at?: string
        }
        Relationships: []
      }
      telegram_links: {
        Row: {
          chat_id: number
          created_at: string
          id: string
          telegram_username: string | null
          user_id: string
        }
        Insert: {
          chat_id: number
          created_at?: string
          id?: string
          telegram_username?: string | null
          user_id: string
        }
        Update: {
          chat_id?: number
          created_at?: string
          id?: string
          telegram_username?: string | null
          user_id?: string
        }
        Relationships: []
      }
      telegram_login_tokens: {
        Row: {
          access_token: string | null
          chat_id: number | null
          created_at: string
          expires_at: string
          id: string
          refresh_token: string | null
          status: string
          telegram_username: string | null
          token: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          chat_id?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string | null
          status?: string
          telegram_username?: string | null
          token: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          chat_id?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string | null
          status?: string
          telegram_username?: string | null
          token?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      telegram_messages: {
        Row: {
          chat_id: number
          created_at: string
          raw_update: Json
          text: string | null
          update_id: number
        }
        Insert: {
          chat_id: number
          created_at?: string
          raw_update: Json
          text?: string | null
          update_id: number
        }
        Update: {
          chat_id?: number
          created_at?: string
          raw_update?: Json
          text?: string | null
          update_id?: number
        }
        Relationships: []
      }
      usage_daily: {
        Row: {
          ai_messages: number
          created_at: string
          day: string
          documents: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_messages?: number
          created_at?: string
          day?: string
          documents?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_messages?: number
          created_at?: string
          day?: string
          documents?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_monthly: {
        Row: {
          created_at: string
          documents: number
          id: string
          month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          documents?: number
          id?: string
          month?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          documents?: number
          id?: string
          month?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          balance_rub: number
          created_at: string
          credits_remaining: number
          credits_total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_rub?: number
          created_at?: string
          credits_remaining?: number
          credits_total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_rub?: number
          created_at?: string
          credits_remaining?: number
          credits_total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gen_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "client" | "lawyer"
      user_plan: "free" | "pro" | "unlimited"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "client", "lawyer"],
      user_plan: ["free", "pro", "unlimited"],
    },
  },
} as const
