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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          record_id: string | null
          table_name: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      admin_invites: {
        Row: {
          accepted_at: string | null
          email: string
          full_name: string
          id: string
          invited_at: string
          invited_by: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }
        Insert: {
          accepted_at?: string | null
          email: string
          full_name: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Update: {
          accepted_at?: string | null
          email?: string
          full_name?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Relationships: []
      }
      client_subscriptions: {
        Row: {
          auto_renew: boolean
          client_id: string
          created_at: string
          id: string
          next_billing_date: string | null
          payment_method: string | null
          plan_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          client_id: string
          created_at?: string
          id?: string
          next_billing_date?: string | null
          payment_method?: string | null
          plan_id: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          client_id?: string
          created_at?: string
          id?: string
          next_billing_date?: string | null
          payment_method?: string | null
          plan_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string
          email: string
          homeowner_profile_id: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email: string
          homeowner_profile_id?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string
          homeowner_profile_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_homeowner_profile_id_fkey"
            columns: ["homeowner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          homeowner_profile_id: string
          id: string
          last_message_at: string | null
          provider_org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          homeowner_profile_id: string
          id?: string
          last_message_at?: string | null
          provider_org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          homeowner_profile_id?: string
          id?: string
          last_message_at?: string | null
          provider_org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_homeowner_profile_id_fkey"
            columns: ["homeowner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_provider_org_id_fkey"
            columns: ["provider_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      homeowner_subscriptions: {
        Row: {
          auto_renew: boolean
          billing_amount: number
          created_at: string
          home_id: string
          homeowner_id: string
          id: string
          next_service_date: string | null
          provider_org_id: string
          service_plan_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          billing_amount: number
          created_at?: string
          home_id: string
          homeowner_id: string
          id?: string
          next_service_date?: string | null
          provider_org_id: string
          service_plan_id: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          billing_amount?: number
          created_at?: string
          home_id?: string
          homeowner_id?: string
          id?: string
          next_service_date?: string | null
          provider_org_id?: string
          service_plan_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homeowner_subscriptions_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homeowner_subscriptions_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homeowner_subscriptions_provider_org_id_fkey"
            columns: ["provider_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homeowner_subscriptions_service_plan_id_fkey"
            columns: ["service_plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      homes: {
        Row: {
          address: string
          city: string
          created_at: string
          id: string
          is_primary: boolean
          name: string
          notes: string | null
          owner_id: string
          property_type: string | null
          square_footage: number | null
          state: string
          updated_at: string
          year_built: number | null
          zip_code: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          id?: string
          is_primary?: boolean
          name: string
          notes?: string | null
          owner_id: string
          property_type?: string | null
          square_footage?: number | null
          state: string
          updated_at?: string
          year_built?: number | null
          zip_code: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          name?: string
          notes?: string | null
          owner_id?: string
          property_type?: string | null
          square_footage?: number | null
          state?: string
          updated_at?: string
          year_built?: number | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "homes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_profile_id: string
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_profile_id: string
          sender_type: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_profile_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string
          id: string
          organization_id: string
          plan_tier: Database["public"]["Enums"]["subscription_tier"]
          started_at: string
          status: string
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          organization_id: string
          plan_tier: Database["public"]["Enums"]["subscription_tier"]
          started_at?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          organization_id?: string
          plan_tier?: Database["public"]["Enums"]["subscription_tier"]
          started_at?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_subscriptions_plan_tier_fkey"
            columns: ["plan_tier"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["tier"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          description: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          service_area: string | null
          service_type: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          service_area?: string | null
          service_type?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          service_area?: string | null
          service_type?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          client_subscription_id: string
          created_at: string
          fee_amount: number
          fee_percent: number
          id: string
          payment_date: string
          status: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount: number
          client_subscription_id: string
          created_at?: string
          fee_amount: number
          fee_percent: number
          id?: string
          payment_date?: string
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount?: number
          client_subscription_id?: string
          created_at?: string
          fee_amount?: number
          fee_percent?: number
          id?: string
          payment_date?: string
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_subscription_id_fkey"
            columns: ["client_subscription_id"]
            isOneToOne: false
            referencedRelation: "client_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
          user_type: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          user_type: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string
          username?: string | null
        }
        Relationships: []
      }
      service_plans: {
        Row: {
          billing_frequency: string
          created_at: string
          description: string | null
          id: string
          includes_features: Json | null
          is_active: boolean
          is_recurring: boolean
          name: string
          organization_id: string
          price: number
          service_type: string | null
          updated_at: string
        }
        Insert: {
          billing_frequency: string
          created_at?: string
          description?: string | null
          id?: string
          includes_features?: Json | null
          is_active?: boolean
          is_recurring?: boolean
          name: string
          organization_id: string
          price: number
          service_type?: string | null
          updated_at?: string
        }
        Update: {
          billing_frequency?: string
          created_at?: string
          description?: string | null
          id?: string
          includes_features?: Json | null
          is_active?: boolean
          is_recurring?: boolean
          name?: string
          organization_id?: string
          price?: number
          service_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          estimated_price: number | null
          final_price: number | null
          home_id: string
          homeowner_id: string
          id: string
          notes: string | null
          preferred_date: string | null
          provider_org_id: string | null
          scheduled_date: string | null
          service_type: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_price?: number | null
          final_price?: number | null
          home_id: string
          homeowner_id: string
          id?: string
          notes?: string | null
          preferred_date?: string | null
          provider_org_id?: string | null
          scheduled_date?: string | null
          service_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_price?: number | null
          final_price?: number | null
          home_id?: string
          homeowner_id?: string
          id?: string
          notes?: string | null
          preferred_date?: string | null
          provider_org_id?: string | null
          scheduled_date?: string | null
          service_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_provider_org_id_fkey"
            columns: ["provider_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_visits: {
        Row: {
          arrival_time: string | null
          completion_time: string | null
          created_at: string
          home_id: string
          homeowner_id: string
          homeowner_subscription_id: string | null
          id: string
          notes: string | null
          photos: Json | null
          provider_org_id: string
          scheduled_date: string
          service_request_id: string | null
          status: string
          technician_name: string | null
          updated_at: string
        }
        Insert: {
          arrival_time?: string | null
          completion_time?: string | null
          created_at?: string
          home_id: string
          homeowner_id: string
          homeowner_subscription_id?: string | null
          id?: string
          notes?: string | null
          photos?: Json | null
          provider_org_id: string
          scheduled_date: string
          service_request_id?: string | null
          status?: string
          technician_name?: string | null
          updated_at?: string
        }
        Update: {
          arrival_time?: string | null
          completion_time?: string | null
          created_at?: string
          home_id?: string
          homeowner_id?: string
          homeowner_subscription_id?: string | null
          id?: string
          notes?: string | null
          photos?: Json | null
          provider_org_id?: string
          scheduled_date?: string
          service_request_id?: string | null
          status?: string
          technician_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_visits_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_visits_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_visits_homeowner_subscription_id_fkey"
            columns: ["homeowner_subscription_id"]
            isOneToOne: false
            referencedRelation: "homeowner_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_visits_provider_org_id_fkey"
            columns: ["provider_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_visits_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          client_limit: number | null
          created_at: string
          features: Json
          id: string
          name: string
          price_monthly: number
          tier: Database["public"]["Enums"]["subscription_tier"]
          transaction_fee_percent: number
          updated_at: string
        }
        Insert: {
          client_limit?: number | null
          created_at?: string
          features?: Json
          id?: string
          name: string
          price_monthly: number
          tier: Database["public"]["Enums"]["subscription_tier"]
          transaction_fee_percent: number
          updated_at?: string
        }
        Update: {
          client_limit?: number | null
          created_at?: string
          features?: Json
          id?: string
          name?: string
          price_monthly?: number
          tier?: Database["public"]["Enums"]["subscription_tier"]
          transaction_fee_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_at: string
          invited_email: string
          organization_id: string
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_email: string
          organization_id: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_email?: string
          organization_id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          fee_amount: number
          fee_percent: number
          id: string
          organization_id: string
          processed_at: string | null
          status: string
          stripe_payment_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          fee_amount: number
          fee_percent: number
          id?: string
          organization_id: string
          processed_at?: string | null
          status?: string
          stripe_payment_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          fee_amount?: number
          fee_percent?: number
          id?: string
          organization_id?: string
          processed_at?: string | null
          status?: string
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          account_type: string
          business_name: string | null
          client_count: string | null
          converted: boolean | null
          created_at: string | null
          current_services: string | null
          email: string
          full_name: string
          id: string
          notified: boolean | null
          phone: string
          referral_source: string | null
          service_type: string | null
          zip_code: string | null
        }
        Insert: {
          account_type: string
          business_name?: string | null
          client_count?: string | null
          converted?: boolean | null
          created_at?: string | null
          current_services?: string | null
          email: string
          full_name: string
          id?: string
          notified?: boolean | null
          phone: string
          referral_source?: string | null
          service_type?: string | null
          zip_code?: string | null
        }
        Update: {
          account_type?: string
          business_name?: string | null
          client_count?: string | null
          converted?: boolean | null
          created_at?: string | null
          current_services?: string | null
          email?: string
          full_name?: string
          id?: string
          notified?: boolean | null
          phone?: string
          referral_source?: string | null
          service_type?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_revenue_summary: {
        Row: {
          arr: number | null
          month: string | null
          mrr: number | null
          subscription_count: number | null
        }
        Relationships: []
      }
      admin_user_stats: {
        Row: {
          count: number | null
          date: string | null
          user_type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_exists: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      can_accept_invite: {
        Args: { _user_id: string }
        Returns: boolean
      }
      get_user_id_by_email: {
        Args: { user_email: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      subscription_tier: "free" | "growth" | "pro" | "scale"
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
      app_role: ["admin", "moderator", "user"],
      subscription_tier: ["free", "growth", "pro", "scale"],
    },
  },
} as const
