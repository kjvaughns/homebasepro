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
      accounting_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          description: string | null
          id: string
          organization_id: string
          receipt_id: string | null
          tax_deductible: boolean | null
          transaction_date: string
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          organization_id: string
          receipt_id?: string | null
          tax_deductible?: boolean | null
          transaction_date: string
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          receipt_id?: string | null
          tax_deductible?: boolean | null
          transaction_date?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_transactions_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
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
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["chat_role"]
          session_id: string
          tool_calls: Json | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["chat_role"]
          session_id: string
          tool_calls?: Json | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["chat_role"]
          session_id?: string
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          profile_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          profile_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          profile_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_learning_events: {
        Row: {
          accuracy_score: number | null
          actual_outcome: Json | null
          ai_predicted: Json | null
          booking_id: string | null
          complexity_factors: Json | null
          created_at: string
          event_type: string
          id: string
          property_size_bucket: string | null
          provider_org_id: string | null
          quote_id: string | null
          region_zip: string | null
          service_call_id: string | null
          service_category: string | null
          service_request_id: string | null
        }
        Insert: {
          accuracy_score?: number | null
          actual_outcome?: Json | null
          ai_predicted?: Json | null
          booking_id?: string | null
          complexity_factors?: Json | null
          created_at?: string
          event_type: string
          id?: string
          property_size_bucket?: string | null
          provider_org_id?: string | null
          quote_id?: string | null
          region_zip?: string | null
          service_call_id?: string | null
          service_category?: string | null
          service_request_id?: string | null
        }
        Update: {
          accuracy_score?: number | null
          actual_outcome?: Json | null
          ai_predicted?: Json | null
          booking_id?: string | null
          complexity_factors?: Json | null
          created_at?: string
          event_type?: string
          id?: string
          property_size_bucket?: string | null
          provider_org_id?: string | null
          quote_id?: string | null
          region_zip?: string | null
          service_call_id?: string | null
          service_category?: string | null
          service_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_learning_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_learning_events_provider_org_id_fkey"
            columns: ["provider_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_learning_events_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_learning_events_service_call_id_fkey"
            columns: ["service_call_id"]
            isOneToOne: false
            referencedRelation: "service_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_learning_events_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          filters: Json | null
          id: string
          priority: string | null
          send_via: string | null
          target_audience: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          filters?: Json | null
          id?: string
          priority?: string | null
          send_via?: string | null
          target_audience: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          filters?: Json | null
          id?: string
          priority?: string | null
          send_via?: string | null
          target_audience?: string
          title?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      balance_snapshots: {
        Row: {
          available_cents: number
          captured_at: string | null
          currency: string | null
          id: string
          organization_id: string | null
          pending_cents: number
        }
        Insert: {
          available_cents?: number
          captured_at?: string | null
          currency?: string | null
          id?: string
          organization_id?: string | null
          pending_cents?: number
        }
        Update: {
          available_cents?: number
          captured_at?: string | null
          currency?: string | null
          id?: string
          organization_id?: string | null
          pending_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "balance_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_access: {
        Row: {
          accepted_at: string | null
          email: string
          id: string
          invited_at: string
          invited_by: string | null
          notes: string | null
          status: string
          user_type: string
        }
        Insert: {
          accepted_at?: string | null
          email: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          notes?: string | null
          status?: string
          user_type: string
        }
        Update: {
          accepted_at?: string | null
          email?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          notes?: string | null
          status?: string
          user_type?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          address: string
          assigned_team_member_id: string | null
          calendar_sync_status: string | null
          cancellation_reason: string | null
          completion_notes: string | null
          completion_photos: Json | null
          created_at: string
          date_time_end: string
          date_time_start: string
          deposit_amount: number | null
          deposit_paid: boolean | null
          deposit_required: boolean | null
          estimated_price_high: number | null
          estimated_price_low: number | null
          external_calendar_event_id: string | null
          final_price: number | null
          home_id: string | null
          homeowner_profile_id: string
          id: string
          invoice_id: string | null
          is_calendar_block: boolean | null
          lat: number | null
          lng: number | null
          notes: string | null
          payment_captured: boolean | null
          precheck_answers: Json | null
          provider_org_id: string
          route_order: number | null
          service_name: string
          status: string
          updated_at: string
          urgency_level: string | null
        }
        Insert: {
          address: string
          assigned_team_member_id?: string | null
          calendar_sync_status?: string | null
          cancellation_reason?: string | null
          completion_notes?: string | null
          completion_photos?: Json | null
          created_at?: string
          date_time_end: string
          date_time_start: string
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_required?: boolean | null
          estimated_price_high?: number | null
          estimated_price_low?: number | null
          external_calendar_event_id?: string | null
          final_price?: number | null
          home_id?: string | null
          homeowner_profile_id: string
          id?: string
          invoice_id?: string | null
          is_calendar_block?: boolean | null
          lat?: number | null
          lng?: number | null
          notes?: string | null
          payment_captured?: boolean | null
          precheck_answers?: Json | null
          provider_org_id: string
          route_order?: number | null
          service_name: string
          status?: string
          updated_at?: string
          urgency_level?: string | null
        }
        Update: {
          address?: string
          assigned_team_member_id?: string | null
          calendar_sync_status?: string | null
          cancellation_reason?: string | null
          completion_notes?: string | null
          completion_photos?: Json | null
          created_at?: string
          date_time_end?: string
          date_time_start?: string
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_required?: boolean | null
          estimated_price_high?: number | null
          estimated_price_low?: number | null
          external_calendar_event_id?: string | null
          final_price?: number | null
          home_id?: string | null
          homeowner_profile_id?: string
          id?: string
          invoice_id?: string | null
          is_calendar_block?: boolean | null
          lat?: number | null
          lng?: number | null
          notes?: string | null
          payment_captured?: boolean | null
          precheck_answers?: Json | null
          provider_org_id?: string
          route_order?: number | null
          service_name?: string
          status?: string
          updated_at?: string
          urgency_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_assigned_team_member_id_fkey"
            columns: ["assigned_team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_homeowner_profile_id_fkey"
            columns: ["homeowner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_provider_org_id_fkey"
            columns: ["provider_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_connections: {
        Row: {
          calendar_id: string | null
          created_at: string
          id: string
          last_synced_at: string | null
          method: string
          oauth_refresh_token: string | null
          oauth_token: string | null
          provider_org_id: string
          status: string
          updated_at: string
        }
        Insert: {
          calendar_id?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          method: string
          oauth_refresh_token?: string | null
          oauth_token?: string | null
          provider_org_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          calendar_id?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          method?: string
          oauth_refresh_token?: string | null
          oauth_token?: string | null
          provider_org_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_provider_org_id_fkey"
            columns: ["provider_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_integrations: {
        Row: {
          access_token: string
          calendar_id: string | null
          calendar_name: string | null
          created_at: string | null
          error_message: string | null
          id: string
          last_sync_at: string | null
          organization_id: string
          provider: string
          refresh_token: string | null
          status: string | null
          sync_direction: string | null
          sync_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          calendar_name?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_sync_at?: string | null
          organization_id: string
          provider: string
          refresh_token?: string | null
          status?: string | null
          sync_direction?: string | null
          sync_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          calendar_name?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_sync_at?: string | null
          organization_id?: string
          provider?: string
          refresh_token?: string | null
          status?: string | null
          sync_direction?: string | null
          sync_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_details: Json | null
          events_failed: number | null
          events_synced: number | null
          id: string
          integration_id: string
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          events_failed?: number | null
          events_synced?: number | null
          id?: string
          integration_id: string
          started_at: string
          status: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          events_failed?: number | null
          events_synced?: number | null
          id?: string
          integration_id?: string
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "calendar_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_files: {
        Row: {
          category: string | null
          client_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          uploaded_by: string
        }
        Insert: {
          category?: string | null
          client_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by: string
        }
        Update: {
          category?: string | null
          client_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          author_profile_id: string
          body: string
          client_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          author_profile_id: string
          body: string
          client_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_profile_id?: string
          body?: string
          client_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          contact_preferences: Json | null
          created_at: string
          home_id: string
          homeowner_profile_id: string
          id: string
          provider_org_id: string
          service_history_summary: string | null
          special_instructions: string | null
          updated_at: string
        }
        Insert: {
          contact_preferences?: Json | null
          created_at?: string
          home_id: string
          homeowner_profile_id: string
          id?: string
          provider_org_id: string
          service_history_summary?: string | null
          special_instructions?: string | null
          updated_at?: string
        }
        Update: {
          contact_preferences?: Json | null
          created_at?: string
          home_id?: string
          homeowner_profile_id?: string
          id?: string
          provider_org_id?: string
          service_history_summary?: string | null
          special_instructions?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_profiles_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_profiles_homeowner_profile_id_fkey"
            columns: ["homeowner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_profiles_provider_org_id_fkey"
            columns: ["provider_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      client_tag_assignments: {
        Row: {
          assigned_at: string
          client_id: string
          tag_id: string
        }
        Insert: {
          assigned_at?: string
          client_id: string
          tag_id: string
        }
        Update: {
          assigned_at?: string
          client_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tag_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "client_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          consent_email: boolean | null
          consent_sms: boolean | null
          created_at: string
          email: string
          homeowner_profile_id: string | null
          id: string
          last_contact_at: string | null
          lifetime_value: number | null
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          status: string
          tags: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          consent_email?: boolean | null
          consent_sms?: boolean | null
          created_at?: string
          email: string
          homeowner_profile_id?: string | null
          id?: string
          last_contact_at?: string | null
          lifetime_value?: number | null
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          consent_email?: boolean | null
          consent_sms?: boolean | null
          created_at?: string
          email?: string
          homeowner_profile_id?: string | null
          id?: string
          last_contact_at?: string | null
          lifetime_value?: number | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          status?: string
          tags?: string[] | null
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
      comm_logs: {
        Row: {
          body: string | null
          channel: string
          client_id: string
          created_at: string
          direction: string
          id: string
          meta: Json | null
          organization_id: string
          subject: string | null
        }
        Insert: {
          body?: string | null
          channel: string
          client_id: string
          created_at?: string
          direction: string
          id?: string
          meta?: Json | null
          organization_id: string
          subject?: string | null
        }
        Update: {
          body?: string | null
          channel?: string
          client_id?: string
          created_at?: string
          direction?: string
          id?: string
          meta?: Json | null
          organization_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comm_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comm_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string | null
          last_read_at: string | null
          notifications_enabled: boolean | null
          profile_id: string
          role: string | null
          status: string | null
        }
        Insert: {
          conversation_id: string
          joined_at?: string | null
          last_read_at?: string | null
          notifications_enabled?: boolean | null
          profile_id: string
          role?: string | null
          status?: string | null
        }
        Update: {
          conversation_id?: string
          joined_at?: string | null
          last_read_at?: string | null
          notifications_enabled?: boolean | null
          profile_id?: string
          role?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          homeowner_profile_id: string
          id: string
          job_id: string | null
          kind: string | null
          last_message_at: string | null
          last_message_preview: string | null
          metadata: Json | null
          provider_org_id: string
          title: string | null
          unread_count_homeowner: number | null
          unread_count_provider: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          homeowner_profile_id: string
          id?: string
          job_id?: string | null
          kind?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          metadata?: Json | null
          provider_org_id: string
          title?: string | null
          unread_count_homeowner?: number | null
          unread_count_provider?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          homeowner_profile_id?: string
          id?: string
          job_id?: string | null
          kind?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          metadata?: Json | null
          provider_org_id?: string
          title?: string | null
          unread_count_homeowner?: number | null
          unread_count_provider?: number | null
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
      customers: {
        Row: {
          created_at: string | null
          default_payment_method: string | null
          id: string
          profile_id: string | null
          stripe_customer_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          default_payment_method?: string | null
          id?: string
          profile_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          default_payment_method?: string | null
          id?: string
          profile_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deep_link_events: {
        Row: {
          campaign: string | null
          converted: boolean | null
          id: string
          link_path: string
          source: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          campaign?: string | null
          converted?: boolean | null
          id?: string
          link_path: string
          source?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          campaign?: string | null
          converted?: boolean | null
          id?: string
          link_path?: string
          source?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      disputes: {
        Row: {
          amount: number
          charge_id: string | null
          created_at: string | null
          currency: string | null
          due_by: string | null
          evidence: Json | null
          id: string
          org_id: string
          payment_id: string | null
          reason: string | null
          status: string | null
          stripe_dispute_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          charge_id?: string | null
          created_at?: string | null
          currency?: string | null
          due_by?: string | null
          evidence?: Json | null
          id?: string
          org_id: string
          payment_id?: string | null
          reason?: string | null
          status?: string | null
          stripe_dispute_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          charge_id?: string | null
          created_at?: string | null
          currency?: string | null
          due_by?: string | null
          evidence?: Json | null
          id?: string
          org_id?: string
          payment_id?: string | null
          reason?: string | null
          status?: string | null
          stripe_dispute_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          homeowner_profile_id: string
          provider_org_id: string
        }
        Insert: {
          created_at?: string
          homeowner_profile_id: string
          provider_org_id: string
        }
        Update: {
          created_at?: string
          homeowner_profile_id?: string
          provider_org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_homeowner_profile_id_fkey"
            columns: ["homeowner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_provider_org_id_fkey"
            columns: ["provider_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_actions: {
        Row: {
          action_type: string
          booking_id: string | null
          completed_at: string | null
          created_at: string | null
          homeowner_id: string
          id: string
          provider_org_id: string
          response_data: Json | null
          scheduled_for: string
          sent_at: string | null
          service_visit_id: string | null
          status: string | null
        }
        Insert: {
          action_type: string
          booking_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          homeowner_id: string
          id?: string
          provider_org_id: string
          response_data?: Json | null
          scheduled_for: string
          sent_at?: string | null
          service_visit_id?: string | null
          status?: string | null
        }
        Update: {
          action_type?: string
          booking_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          homeowner_id?: string
          id?: string
          provider_org_id?: string
          response_data?: Json | null
          scheduled_for?: string
          sent_at?: string | null
          service_visit_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_actions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_actions_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_actions_provider_org_id_fkey"
            columns: ["provider_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_actions_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "service_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_checks: {
        Row: {
          check_result: string
          created_at: string | null
          device_fingerprint: string | null
          email: string | null
          id: string
          ip: unknown
          phone: string | null
          reason: string | null
          referrer_code: string | null
        }
        Insert: {
          check_result: string
          created_at?: string | null
          device_fingerprint?: string | null
          email?: string | null
          id?: string
          ip?: unknown
          phone?: string | null
          reason?: string | null
          referrer_code?: string | null
        }
        Update: {
          check_result?: string
          created_at?: string | null
          device_fingerprint?: string | null
          email?: string | null
          id?: string
          ip?: unknown
          phone?: string | null
          reason?: string | null
          referrer_code?: string | null
        }
        Relationships: []
      }
      help_article_feedback: {
        Row: {
          article_id: string | null
          created_at: string | null
          feedback_text: string | null
          helpful: boolean
          id: string
          user_id: string | null
        }
        Insert: {
          article_id?: string | null
          created_at?: string | null
          feedback_text?: string | null
          helpful: boolean
          id?: string
          user_id?: string | null
        }
        Update: {
          article_id?: string | null
          created_at?: string | null
          feedback_text?: string | null
          helpful?: boolean
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_article_feedback_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          category: string
          content: string
          created_at: string | null
          id: string
          order_index: number | null
          related_article_ids: string[] | null
          screenshot_urls: Json | null
          slug: string
          title: string
          updated_at: string | null
          user_type: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          id?: string
          order_index?: number | null
          related_article_ids?: string[] | null
          screenshot_urls?: Json | null
          slug: string
          title: string
          updated_at?: string | null
          user_type: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          order_index?: number | null
          related_article_ids?: string[] | null
          screenshot_urls?: Json | null
          slug?: string
          title?: string
          updated_at?: string | null
          user_type?: string
        }
        Relationships: []
      }
      home_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          home_id: string | null
          id: string
          photo_url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          home_id?: string | null
          id?: string
          photo_url: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          home_id?: string | null
          id?: string
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_photos_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
      homeowner_documents: {
        Row: {
          created_at: string | null
          document_type: string
          file_size: number | null
          file_url: string
          id: string
          metadata: Json | null
          profile_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_type: string
          file_size?: number | null
          file_url: string
          id?: string
          metadata?: Json | null
          profile_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: string
          file_size?: number | null
          file_url?: string
          id?: string
          metadata?: Json | null
          profile_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homeowner_documents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homeowner_maintenance_plans: {
        Row: {
          created_at: string | null
          homeowner_profile_id: string | null
          id: string
          plan_data: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          homeowner_profile_id?: string | null
          id?: string
          plan_data: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          homeowner_profile_id?: string | null
          id?: string
          plan_data?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homeowner_maintenance_plans_homeowner_profile_id_fkey"
            columns: ["homeowner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homeowner_subscriptions: {
        Row: {
          auto_renew: boolean
          billing_amount: number
          created_at: string
          entitlements: Json | null
          home_id: string
          homeowner_id: string
          id: string
          next_service_date: string | null
          payment_method_active: boolean | null
          platform: string | null
          provider_org_id: string
          revenuecat_customer_id: string | null
          service_plan_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          billing_amount: number
          created_at?: string
          entitlements?: Json | null
          home_id: string
          homeowner_id: string
          id?: string
          next_service_date?: string | null
          payment_method_active?: boolean | null
          platform?: string | null
          provider_org_id: string
          revenuecat_customer_id?: string | null
          service_plan_id: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          billing_amount?: number
          created_at?: string
          entitlements?: Json | null
          home_id?: string
          homeowner_id?: string
          id?: string
          next_service_date?: string | null
          payment_method_active?: boolean | null
          platform?: string | null
          provider_org_id?: string
          revenuecat_customer_id?: string | null
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
          access_notes: string | null
          address: string
          bathrooms: number | null
          bedrooms: number | null
          city: string
          created_at: string
          gate_code: string | null
          hvac_system_count: number | null
          id: string
          is_default: boolean | null
          is_primary: boolean
          last_hvac_service: string | null
          last_lawn_service: string | null
          last_plumbing_service: string | null
          lat: number | null
          lawn_sqft: number | null
          lng: number | null
          lot_acres: number | null
          maintenance_score: number | null
          name: string
          notes: string | null
          owner_id: string
          pets: string | null
          pool_type: string | null
          preferred_contact_method: string | null
          property_type: string | null
          square_footage: number | null
          state: string
          updated_at: string
          water_heater_type: string | null
          year_built: number | null
          zip_code: string
        }
        Insert: {
          access_notes?: string | null
          address: string
          bathrooms?: number | null
          bedrooms?: number | null
          city: string
          created_at?: string
          gate_code?: string | null
          hvac_system_count?: number | null
          id?: string
          is_default?: boolean | null
          is_primary?: boolean
          last_hvac_service?: string | null
          last_lawn_service?: string | null
          last_plumbing_service?: string | null
          lat?: number | null
          lawn_sqft?: number | null
          lng?: number | null
          lot_acres?: number | null
          maintenance_score?: number | null
          name: string
          notes?: string | null
          owner_id: string
          pets?: string | null
          pool_type?: string | null
          preferred_contact_method?: string | null
          property_type?: string | null
          square_footage?: number | null
          state: string
          updated_at?: string
          water_heater_type?: string | null
          year_built?: number | null
          zip_code: string
        }
        Update: {
          access_notes?: string | null
          address?: string
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          created_at?: string
          gate_code?: string | null
          hvac_system_count?: number | null
          id?: string
          is_default?: boolean | null
          is_primary?: boolean
          last_hvac_service?: string | null
          last_lawn_service?: string | null
          last_plumbing_service?: string | null
          lat?: number | null
          lawn_sqft?: number | null
          lng?: number | null
          lot_acres?: number | null
          maintenance_score?: number | null
          name?: string
          notes?: string | null
          owner_id?: string
          pets?: string | null
          pool_type?: string | null
          preferred_contact_method?: string | null
          property_type?: string | null
          square_footage?: number | null
          state?: string
          updated_at?: string
          water_heater_type?: string | null
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
      integrations: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          integration_type: string
          is_connected: boolean | null
          last_sync_at: string | null
          organization_id: string
          provider: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          integration_type: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          organization_id: string
          provider: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          integration_type?: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          organization_id?: string
          provider?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      intercom_sessions: {
        Row: {
          context: Json | null
          conversation_id: string
          created_at: string | null
          id: string
          last_activity_at: string | null
          session_id: string | null
          user_id: string | null
          user_role: string
        }
        Insert: {
          context?: Json | null
          conversation_id: string
          created_at?: string | null
          id?: string
          last_activity_at?: string | null
          session_id?: string | null
          user_id?: string | null
          user_role: string
        }
        Update: {
          context?: Json | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          last_activity_at?: string | null
          session_id?: string | null
          user_id?: string | null
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "intercom_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string | null
          due_date: string
          email_sent_at: string | null
          email_status: string | null
          expires_at: string | null
          id: string
          invoice_number: string
          job_id: string | null
          line_items: Json | null
          notes: string | null
          organization_id: string
          paid_at: string | null
          pdf_url: string | null
          status: string | null
          stripe_checkout_session_id: string | null
          stripe_checkout_url: string | null
          stripe_customer_id: string | null
          stripe_hosted_url: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          stripe_payment_link_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string | null
          due_date: string
          email_sent_at?: string | null
          email_status?: string | null
          expires_at?: string | null
          id?: string
          invoice_number: string
          job_id?: string | null
          line_items?: Json | null
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          pdf_url?: string | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_checkout_url?: string | null
          stripe_customer_id?: string | null
          stripe_hosted_url?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_link_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string | null
          due_date?: string
          email_sent_at?: string | null
          email_status?: string | null
          expires_at?: string | null
          id?: string
          invoice_number?: string
          job_id?: string | null
          line_items?: Json | null
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          pdf_url?: string | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_checkout_url?: string | null
          stripe_customer_id?: string | null
          stripe_hosted_url?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_link_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          body_md: string
          category: string
          created_at: string
          id: string
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          body_md: string
          category: string
          created_at?: string
          id?: string
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          category?: string
          created_at?: string
          id?: string
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          amount_cents: number
          created_at: string | null
          currency: string | null
          direction: string
          homeowner_id: string | null
          id: string
          job_id: string | null
          metadata: Json | null
          occurred_at: string
          party: string
          provider_id: string | null
          stripe_ref: string | null
          type: string
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          currency?: string | null
          direction: string
          homeowner_id?: string | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          occurred_at?: string
          party: string
          provider_id?: string | null
          stripe_ref?: string | null
          type: string
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          currency?: string | null
          direction?: string
          homeowner_id?: string | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          occurred_at?: string
          party?: string
          provider_id?: string | null
          stripe_ref?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_reminders: {
        Row: {
          created_at: string | null
          description: string | null
          dismissed_at: string | null
          due_date: string
          home_id: string
          homeowner_id: string
          id: string
          last_service_date: string | null
          priority: string | null
          reminder_type: string
          scheduled_booking_id: string | null
          service_category: string
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          dismissed_at?: string | null
          due_date: string
          home_id: string
          homeowner_id: string
          id?: string
          last_service_date?: string | null
          priority?: string | null
          reminder_type: string
          scheduled_booking_id?: string | null
          service_category: string
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          dismissed_at?: string | null
          due_date?: string
          home_id?: string
          homeowner_id?: string
          id?: string
          last_service_date?: string | null
          priority?: string | null
          reminder_type?: string
          scheduled_booking_id?: string | null
          service_category?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_reminders_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_reminders_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_reminders_scheduled_booking_id_fkey"
            columns: ["scheduled_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_metadata: Json | null
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          message_type: string | null
          meta: Json | null
          read: boolean
          sender_profile_id: string
          sender_type: string
        }
        Insert: {
          attachment_metadata?: Json | null
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          message_type?: string | null
          meta?: Json | null
          read?: boolean
          sender_profile_id: string
          sender_type: string
        }
        Update: {
          attachment_metadata?: Json | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          message_type?: string | null
          meta?: Json | null
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
      notification_outbox: {
        Row: {
          attempts: number | null
          channel: string
          created_at: string | null
          id: string
          last_attempt_at: string | null
          last_error: string | null
          notification_id: string
          status: string
        }
        Insert: {
          attempts?: number | null
          channel: string
          created_at?: string | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          notification_id: string
          status?: string
        }
        Update: {
          attempts?: number | null
          channel?: string
          created_at?: string | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          notification_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          announce_email: boolean | null
          announce_inapp: boolean | null
          announce_push: boolean | null
          booking_email: boolean | null
          booking_inapp: boolean | null
          booking_push: boolean | null
          created_at: string | null
          id: string
          job_email: boolean | null
          job_inapp: boolean | null
          job_push: boolean | null
          message_email: boolean | null
          message_inapp: boolean | null
          message_push: boolean | null
          payment_email: boolean | null
          payment_inapp: boolean | null
          payment_push: boolean | null
          payout_email: boolean | null
          payout_inapp: boolean | null
          payout_push: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          quote_email: boolean | null
          quote_inapp: boolean | null
          quote_push: boolean | null
          review_email: boolean | null
          review_inapp: boolean | null
          review_push: boolean | null
          role: string
          timezone: string | null
          updated_at: string | null
          user_id: string
          weekly_digest_email: boolean | null
          weekly_digest_enabled: boolean | null
        }
        Insert: {
          announce_email?: boolean | null
          announce_inapp?: boolean | null
          announce_push?: boolean | null
          booking_email?: boolean | null
          booking_inapp?: boolean | null
          booking_push?: boolean | null
          created_at?: string | null
          id?: string
          job_email?: boolean | null
          job_inapp?: boolean | null
          job_push?: boolean | null
          message_email?: boolean | null
          message_inapp?: boolean | null
          message_push?: boolean | null
          payment_email?: boolean | null
          payment_inapp?: boolean | null
          payment_push?: boolean | null
          payout_email?: boolean | null
          payout_inapp?: boolean | null
          payout_push?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quote_email?: boolean | null
          quote_inapp?: boolean | null
          quote_push?: boolean | null
          review_email?: boolean | null
          review_inapp?: boolean | null
          review_push?: boolean | null
          role: string
          timezone?: string | null
          updated_at?: string | null
          user_id: string
          weekly_digest_email?: boolean | null
          weekly_digest_enabled?: boolean | null
        }
        Update: {
          announce_email?: boolean | null
          announce_inapp?: boolean | null
          announce_push?: boolean | null
          booking_email?: boolean | null
          booking_inapp?: boolean | null
          booking_push?: boolean | null
          created_at?: string | null
          id?: string
          job_email?: boolean | null
          job_inapp?: boolean | null
          job_push?: boolean | null
          message_email?: boolean | null
          message_inapp?: boolean | null
          message_push?: boolean | null
          payment_email?: boolean | null
          payment_inapp?: boolean | null
          payment_push?: boolean | null
          payout_email?: boolean | null
          payout_inapp?: boolean | null
          payout_push?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quote_email?: boolean | null
          quote_inapp?: boolean | null
          quote_push?: boolean | null
          review_email?: boolean | null
          review_inapp?: boolean | null
          review_push?: boolean | null
          role?: string
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
          weekly_digest_email?: boolean | null
          weekly_digest_enabled?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          channel_email: boolean | null
          channel_inapp: boolean | null
          channel_push: boolean | null
          created_at: string | null
          delivered_email: boolean | null
          delivered_inapp: boolean | null
          delivered_push: boolean | null
          id: string
          metadata: Json | null
          profile_id: string | null
          read_at: string | null
          role: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          body: string
          channel_email?: boolean | null
          channel_inapp?: boolean | null
          channel_push?: boolean | null
          created_at?: string | null
          delivered_email?: boolean | null
          delivered_inapp?: boolean | null
          delivered_push?: boolean | null
          id?: string
          metadata?: Json | null
          profile_id?: string | null
          read_at?: string | null
          role?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          body?: string
          channel_email?: boolean | null
          channel_inapp?: boolean | null
          channel_push?: boolean | null
          created_at?: string | null
          delivered_email?: boolean | null
          delivered_inapp?: boolean | null
          delivered_push?: boolean | null
          id?: string
          metadata?: Json | null
          profile_id?: string | null
          read_at?: string | null
          role?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
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
          avg_response_time_hours: number | null
          base_zip: string | null
          business_address: string | null
          business_city: string | null
          business_lat: number | null
          business_lng: number | null
          business_state: string | null
          business_zip: string | null
          city: string | null
          completion_rate: number | null
          cover_image_url: string | null
          created_at: string
          default_payout_method: string | null
          description: string | null
          email: string | null
          hero_image_url: string | null
          id: string
          instant_payouts_enabled: boolean | null
          lat: number | null
          lng: number | null
          logo_url: string | null
          name: string
          next_payout_date: string | null
          owner_id: string
          payments_ready: boolean
          phone: string | null
          plan: string | null
          rating_avg: number | null
          rating_count: number | null
          service_area: string | null
          service_radius_miles: number | null
          service_type: string[] | null
          slug: string
          socials: Json | null
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean | null
          tagline: string | null
          team_limit: number | null
          transaction_fee_pct: number | null
          updated_at: string
          verification_notes: string | null
          verification_status: string | null
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          avg_response_time_hours?: number | null
          base_zip?: string | null
          business_address?: string | null
          business_city?: string | null
          business_lat?: number | null
          business_lng?: number | null
          business_state?: string | null
          business_zip?: string | null
          city?: string | null
          completion_rate?: number | null
          cover_image_url?: string | null
          created_at?: string
          default_payout_method?: string | null
          description?: string | null
          email?: string | null
          hero_image_url?: string | null
          id?: string
          instant_payouts_enabled?: boolean | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name: string
          next_payout_date?: string | null
          owner_id: string
          payments_ready?: boolean
          phone?: string | null
          plan?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          service_area?: string | null
          service_radius_miles?: number | null
          service_type?: string[] | null
          slug: string
          socials?: Json | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          tagline?: string | null
          team_limit?: number | null
          transaction_fee_pct?: number | null
          updated_at?: string
          verification_notes?: string | null
          verification_status?: string | null
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          avg_response_time_hours?: number | null
          base_zip?: string | null
          business_address?: string | null
          business_city?: string | null
          business_lat?: number | null
          business_lng?: number | null
          business_state?: string | null
          business_zip?: string | null
          city?: string | null
          completion_rate?: number | null
          cover_image_url?: string | null
          created_at?: string
          default_payout_method?: string | null
          description?: string | null
          email?: string | null
          hero_image_url?: string | null
          id?: string
          instant_payouts_enabled?: boolean | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name?: string
          next_payout_date?: string | null
          owner_id?: string
          payments_ready?: boolean
          phone?: string | null
          plan?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          service_area?: string | null
          service_radius_miles?: number | null
          service_type?: string[] | null
          slug?: string
          socials?: Json | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          tagline?: string | null
          team_limit?: number | null
          transaction_fee_pct?: number | null
          updated_at?: string
          verification_notes?: string | null
          verification_status?: string | null
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: []
      }
      parts_materials: {
        Row: {
          category: string | null
          cost_price: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          markup_percentage: number | null
          name: string
          organization_id: string
          quantity_on_hand: number | null
          sell_price: number | null
          sku: string | null
          supplier: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          markup_percentage?: number | null
          name: string
          organization_id: string
          quantity_on_hand?: number | null
          sell_price?: number | null
          sku?: string | null
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          markup_percentage?: number | null
          name?: string
          organization_id?: string
          quantity_on_hand?: number | null
          sell_price?: number | null
          sku?: string | null
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_materials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_errors: {
        Row: {
          action: string
          created_at: string | null
          error_code: string | null
          error_message: string
          id: string
          org_id: string | null
          request_body: Json | null
          stripe_error_details: Json | null
        }
        Insert: {
          action: string
          created_at?: string | null
          error_code?: string | null
          error_message: string
          id?: string
          org_id?: string | null
          request_body?: Json | null
          stripe_error_details?: Json | null
        }
        Update: {
          action?: string
          created_at?: string | null
          error_code?: string | null
          error_message?: string
          id?: string
          org_id?: string | null
          request_body?: Json | null
          stripe_error_details?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_errors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          application_fee_cents: number | null
          booking_id: string | null
          captured: boolean | null
          client_subscription_id: string
          created_at: string
          currency: string | null
          fee_amount: number
          fee_pct_at_time: number | null
          fee_percent: number
          id: string
          invoice_id: string | null
          meta: Json | null
          org_id: string | null
          payment_date: string
          payment_method: string | null
          refunded_cents: number | null
          status: string
          stripe_payment_intent_id: string | null
          transfer_destination: string | null
          transfer_group: string | null
          type: string | null
          url: string | null
        }
        Insert: {
          amount: number
          application_fee_cents?: number | null
          booking_id?: string | null
          captured?: boolean | null
          client_subscription_id: string
          created_at?: string
          currency?: string | null
          fee_amount: number
          fee_pct_at_time?: number | null
          fee_percent: number
          id?: string
          invoice_id?: string | null
          meta?: Json | null
          org_id?: string | null
          payment_date?: string
          payment_method?: string | null
          refunded_cents?: number | null
          status?: string
          stripe_payment_intent_id?: string | null
          transfer_destination?: string | null
          transfer_group?: string | null
          type?: string | null
          url?: string | null
        }
        Update: {
          amount?: number
          application_fee_cents?: number | null
          booking_id?: string | null
          captured?: boolean | null
          client_subscription_id?: string
          created_at?: string
          currency?: string | null
          fee_amount?: number
          fee_pct_at_time?: number | null
          fee_percent?: number
          id?: string
          invoice_id?: string | null
          meta?: Json | null
          org_id?: string | null
          payment_date?: string
          payment_method?: string | null
          refunded_cents?: number | null
          status?: string
          stripe_payment_intent_id?: string | null
          transfer_destination?: string | null
          transfer_group?: string | null
          type?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_subscription_id_fkey"
            columns: ["client_subscription_id"]
            isOneToOne: false
            referencedRelation: "client_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          arrival_date: string | null
          created_at: string | null
          currency: string | null
          id: string
          org_id: string
          status: string | null
          stripe_payout_id: string | null
        }
        Insert: {
          amount: number
          arrival_date?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          org_id: string
          status?: string | null
          stripe_payout_id?: string | null
        }
        Update: {
          amount?: number
          arrival_date?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          org_id?: string
          status?: string | null
          stripe_payout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_items: {
        Row: {
          created_at: string
          deductions: number | null
          gross_pay: number
          id: string
          net_pay: number
          overtime_hours: number | null
          payment_date: string | null
          payment_method: string | null
          payroll_run_id: string
          regular_hours: number | null
          status: string
          team_member_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deductions?: number | null
          gross_pay: number
          id?: string
          net_pay: number
          overtime_hours?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payroll_run_id: string
          regular_hours?: number | null
          status?: string
          team_member_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deductions?: number | null
          gross_pay?: number
          id?: string
          net_pay?: number
          overtime_hours?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payroll_run_id?: string
          regular_hours?: number | null
          status?: string
          team_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          period_end: string
          period_start: string
          processed_at: string | null
          processed_by: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          period_end: string
          period_start: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          period_end?: string
          period_start?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      price_estimates: {
        Row: {
          base_flat: number | null
          base_per_unit: number | null
          confidence: number
          created_at: string
          estimate: number
          id: string
          multipliers: Json | null
          property_lookup_id: string | null
          service_name: string
          session_id: string | null
          unit_type: string
          units: number
        }
        Insert: {
          base_flat?: number | null
          base_per_unit?: number | null
          confidence?: number
          created_at?: string
          estimate: number
          id?: string
          multipliers?: Json | null
          property_lookup_id?: string | null
          service_name: string
          session_id?: string | null
          unit_type: string
          units: number
        }
        Update: {
          base_flat?: number | null
          base_per_unit?: number | null
          confidence?: number
          created_at?: string
          estimate?: number
          id?: string
          multipliers?: Json | null
          property_lookup_id?: string | null
          service_name?: string
          session_id?: string | null
          unit_type?: string
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_estimates_property_lookup_id_fkey"
            columns: ["property_lookup_id"]
            isOneToOne: false
            referencedRelation: "property_lookups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_estimates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_city: string | null
          address_country: string | null
          address_line1: string | null
          address_line2: string | null
          address_postal_code: string | null
          address_state: string | null
          avatar_url: string | null
          created_at: string
          default_property_id: string | null
          full_name: string
          has_completed_service_assessment: boolean | null
          id: string
          is_beta: boolean | null
          last_activity_at: string | null
          milestone_celebrations: Json | null
          onboarded_at: string | null
          phone: string | null
          plan: string | null
          seen_tutorial_at: string | null
          setup_completed: boolean | null
          setup_completed_at: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          trial_extended: boolean | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
          user_type: string
          username: string | null
        }
        Insert: {
          address_city?: string | null
          address_country?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_postal_code?: string | null
          address_state?: string | null
          avatar_url?: string | null
          created_at?: string
          default_property_id?: string | null
          full_name: string
          has_completed_service_assessment?: boolean | null
          id?: string
          is_beta?: boolean | null
          last_activity_at?: string | null
          milestone_celebrations?: Json | null
          onboarded_at?: string | null
          phone?: string | null
          plan?: string | null
          seen_tutorial_at?: string | null
          setup_completed?: boolean | null
          setup_completed_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_extended?: boolean | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
          user_type: string
          username?: string | null
        }
        Update: {
          address_city?: string | null
          address_country?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_postal_code?: string | null
          address_state?: string | null
          avatar_url?: string | null
          created_at?: string
          default_property_id?: string | null
          full_name?: string
          has_completed_service_assessment?: boolean | null
          id?: string
          is_beta?: boolean | null
          last_activity_at?: string | null
          milestone_celebrations?: Json | null
          onboarded_at?: string | null
          phone?: string | null
          plan?: string | null
          seen_tutorial_at?: string | null
          setup_completed?: boolean | null
          setup_completed_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_extended?: boolean | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_property_id_fkey"
            columns: ["default_property_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          city: string
          created_at: string | null
          homeowner_id: string
          id: string
          state: string
          updated_at: string | null
          zip_code: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string | null
          homeowner_id: string
          id?: string
          state: string
          updated_at?: string | null
          zip_code: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string | null
          homeowner_id?: string
          id?: string
          state?: string
          updated_at?: string | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      property_lookups: {
        Row: {
          address_input: string
          address_std: string | null
          baths: number | null
          beds: number | null
          created_at: string
          id: string
          lot_acres: number | null
          raw_data: Json | null
          sqft: number | null
          updated_at: string
          year_built: number | null
          zip: string | null
          zpid: string | null
        }
        Insert: {
          address_input: string
          address_std?: string | null
          baths?: number | null
          beds?: number | null
          created_at?: string
          id?: string
          lot_acres?: number | null
          raw_data?: Json | null
          sqft?: number | null
          updated_at?: string
          year_built?: number | null
          zip?: string | null
          zpid?: string | null
        }
        Update: {
          address_input?: string
          address_std?: string | null
          baths?: number | null
          beds?: number | null
          created_at?: string
          id?: string
          lot_acres?: number | null
          raw_data?: Json | null
          sqft?: number | null
          updated_at?: string
          year_built?: number | null
          zip?: string | null
          zpid?: string | null
        }
        Relationships: []
      }
      property_systems: {
        Row: {
          created_at: string
          home_id: string
          id: string
          install_date: string | null
          last_service_date: string | null
          manufacturer: string | null
          model: string | null
          notes: string | null
          system_type: string
          updated_at: string
          warranty_expires: string | null
        }
        Insert: {
          created_at?: string
          home_id: string
          id?: string
          install_date?: string | null
          last_service_date?: string | null
          manufacturer?: string | null
          model?: string | null
          notes?: string | null
          system_type: string
          updated_at?: string
          warranty_expires?: string | null
        }
        Update: {
          created_at?: string
          home_id?: string
          id?: string
          install_date?: string | null
          last_service_date?: string | null
          manufacturer?: string | null
          model?: string | null
          notes?: string | null
          system_type?: string
          updated_at?: string
          warranty_expires?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_systems_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_booking_links: {
        Row: {
          auto_confirm: boolean | null
          booking_window_days: number | null
          created_at: string | null
          custom_message: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          require_precheck: boolean | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          auto_confirm?: boolean | null
          booking_window_days?: number | null
          created_at?: string | null
          custom_message?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          require_precheck?: boolean | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          auto_confirm?: boolean | null
          booking_window_days?: number | null
          created_at?: string | null
          custom_message?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          require_precheck?: boolean | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_booking_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_branding: {
        Row: {
          brand_color_primary: string | null
          brand_color_secondary: string | null
          cname_verification_token: string | null
          cname_verified: boolean
          created_at: string
          custom_domain: string | null
          org_id: string
          updated_at: string
        }
        Insert: {
          brand_color_primary?: string | null
          brand_color_secondary?: string | null
          cname_verification_token?: string | null
          cname_verified?: boolean
          created_at?: string
          custom_domain?: string | null
          org_id: string
          updated_at?: string
        }
        Update: {
          brand_color_primary?: string | null
          brand_color_secondary?: string | null
          cname_verification_token?: string | null
          cname_verified?: boolean
          created_at?: string
          custom_domain?: string | null
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_branding_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_capabilities: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          provider_org_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          provider_org_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          provider_org_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_capabilities_provider_org_id_fkey"
            columns: ["provider_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_capabilities_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "service_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_metrics: {
        Row: {
          avg_rating: number | null
          created_at: string | null
          id: string
          jobs_completed_last_month: number | null
          last_calculated_at: string | null
          on_time_rate: number | null
          provider_org_id: string
          repeat_customer_rate: number | null
          response_speed_minutes: number | null
          satisfaction_score: number | null
          total_jobs_completed: number | null
          trust_score: number | null
          updated_at: string | null
        }
        Insert: {
          avg_rating?: number | null
          created_at?: string | null
          id?: string
          jobs_completed_last_month?: number | null
          last_calculated_at?: string | null
          on_time_rate?: number | null
          provider_org_id: string
          repeat_customer_rate?: number | null
          response_speed_minutes?: number | null
          satisfaction_score?: number | null
          total_jobs_completed?: number | null
          trust_score?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_rating?: number | null
          created_at?: string | null
          id?: string
          jobs_completed_last_month?: number | null
          last_calculated_at?: string | null
          on_time_rate?: number | null
          provider_org_id?: string
          repeat_customer_rate?: number | null
          response_speed_minutes?: number | null
          satisfaction_score?: number | null
          total_jobs_completed?: number | null
          trust_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_metrics_provider_org_id_fkey"
            columns: ["provider_org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_onboarding_answers: {
        Row: {
          answer: string
          created_at: string | null
          id: string
          provider_org_id: string
          question: string
        }
        Insert: {
          answer: string
          created_at?: string | null
          id?: string
          provider_org_id: string
          question: string
        }
        Update: {
          answer?: string
          created_at?: string | null
          id?: string
          provider_org_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_onboarding_answers_provider_org_id_fkey"
            columns: ["provider_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_portfolio: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string
          is_featured: boolean | null
          org_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_featured?: boolean | null
          org_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_featured?: boolean | null
          org_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_portfolio_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_promotions: {
        Row: {
          created_at: string | null
          current_uses: number | null
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          promo_code: string | null
          provider_org_id: string
          title: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          promo_code?: string | null
          provider_org_id: string
          title: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          promo_code?: string | null
          provider_org_id?: string
          title?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_promotions_provider_org_id_fkey"
            columns: ["provider_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_rates: {
        Row: {
          base_flat: number | null
          base_per_unit: number | null
          created_at: string
          dynamic_pricing_enabled: boolean | null
          id: string
          max_fee: number | null
          min_fee: number | null
          provider_org_id: string
          service_name: string
          travel_fee: number | null
          unit_type: string
          updated_at: string
        }
        Insert: {
          base_flat?: number | null
          base_per_unit?: number | null
          created_at?: string
          dynamic_pricing_enabled?: boolean | null
          id?: string
          max_fee?: number | null
          min_fee?: number | null
          provider_org_id: string
          service_name: string
          travel_fee?: number | null
          unit_type: string
          updated_at?: string
        }
        Update: {
          base_flat?: number | null
          base_per_unit?: number | null
          created_at?: string
          dynamic_pricing_enabled?: boolean | null
          id?: string
          max_fee?: number | null
          min_fee?: number | null
          provider_org_id?: string
          service_name?: string
          travel_fee?: number | null
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_rates_provider_org_id_fkey"
            columns: ["provider_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          id: string
          plan: string
          provider_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          plan?: string
          provider_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          plan?: string
          provider_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_subscriptions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notification_logs: {
        Row: {
          created_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          notification_type: string
          payload: Json | null
          profile_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          notification_type: string
          payload?: Json | null
          profile_id?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          notification_type?: string
          payload?: Json | null
          profile_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_notification_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          accepted_at: string | null
          ai_confidence: number | null
          ai_generated: boolean | null
          converted_to_booking_id: string | null
          created_at: string
          description: string | null
          home_id: string
          homeowner_id: string
          id: string
          labor_cost: number | null
          line_items: Json | null
          parts_cost: number | null
          pricing_factors: Json | null
          provider_org_id: string
          quote_type: string
          rejected_at: string | null
          rejection_reason: string | null
          service_name: string
          service_request_id: string | null
          status: string
          total_amount: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          accepted_at?: string | null
          ai_confidence?: number | null
          ai_generated?: boolean | null
          converted_to_booking_id?: string | null
          created_at?: string
          description?: string | null
          home_id: string
          homeowner_id: string
          id?: string
          labor_cost?: number | null
          line_items?: Json | null
          parts_cost?: number | null
          pricing_factors?: Json | null
          provider_org_id: string
          quote_type: string
          rejected_at?: string | null
          rejection_reason?: string | null
          service_name: string
          service_request_id?: string | null
          status?: string
          total_amount: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          accepted_at?: string | null
          ai_confidence?: number | null
          ai_generated?: boolean | null
          converted_to_booking_id?: string | null
          created_at?: string
          description?: string | null
          home_id?: string
          homeowner_id?: string
          id?: string
          labor_cost?: number | null
          line_items?: Json | null
          parts_cost?: number | null
          pricing_factors?: Json | null
          provider_org_id?: string
          quote_type?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          service_name?: string
          service_request_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_converted_to_booking_id_fkey"
            columns: ["converted_to_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_provider_org_id_fkey"
            columns: ["provider_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string | null
          file_name: string
          file_url: string
          id: string
          organization_id: string
          receipt_date: string | null
          updated_at: string | null
          vendor: string | null
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          file_name: string
          file_url: string
          id?: string
          organization_id: string
          receipt_date?: string | null
          updated_at?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          file_name?: string
          file_url?: string
          id?: string
          organization_id?: string
          receipt_date?: string | null
          updated_at?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_achievements: {
        Row: {
          achievement_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          unlocked_at: string | null
          user_id: string | null
        }
        Insert: {
          achievement_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          unlocked_at?: string | null
          user_id?: string | null
        }
        Update: {
          achievement_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          unlocked_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      referral_events: {
        Row: {
          created_at: string | null
          device_fingerprint: string | null
          id: string
          ip: unknown
          referred_profile_id: string
          referred_user_id: string | null
          referrer_code: string
        }
        Insert: {
          created_at?: string | null
          device_fingerprint?: string | null
          id?: string
          ip?: unknown
          referred_profile_id: string
          referred_user_id?: string | null
          referrer_code: string
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string | null
          id?: string
          ip?: unknown
          referred_profile_id?: string
          referred_user_id?: string | null
          referrer_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_events_referred_profile_id_fkey"
            columns: ["referred_profile_id"]
            isOneToOne: false
            referencedRelation: "referral_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_profiles: {
        Row: {
          created_at: string | null
          device_fingerprint: string | null
          id: string
          ip_created: unknown
          referral_code: string
          referred_by_code: string | null
          rewards_meta: Json | null
          role: string
          updated_at: string | null
          user_id: string | null
          waitlist_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_fingerprint?: string | null
          id?: string
          ip_created?: unknown
          referral_code: string
          referred_by_code?: string | null
          rewards_meta?: Json | null
          role: string
          updated_at?: string | null
          user_id?: string | null
          waitlist_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string | null
          id?: string
          ip_created?: unknown
          referral_code?: string
          referred_by_code?: string | null
          rewards_meta?: Json | null
          role?: string
          updated_at?: string | null
          user_id?: string | null
          waitlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_profiles_waitlist_id_fkey"
            columns: ["waitlist_id"]
            isOneToOne: false
            referencedRelation: "waitlist"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_stats: {
        Row: {
          eligible_referred: number | null
          last_updated: string | null
          referrer_code: string
          total_referred: number | null
        }
        Insert: {
          eligible_referred?: number | null
          last_updated?: string | null
          referrer_code: string
          total_referred?: number | null
        }
        Update: {
          eligible_referred?: number | null
          last_updated?: string | null
          referrer_code?: string
          total_referred?: number | null
        }
        Relationships: []
      }
      refund_requests: {
        Row: {
          amount_requested: number
          booking_id: string
          created_at: string
          homeowner_profile_id: string
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          provider_org_id: string
          reason: string
          status: string
        }
        Insert: {
          amount_requested: number
          booking_id: string
          created_at?: string
          homeowner_profile_id: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          provider_org_id: string
          reason: string
          status?: string
        }
        Update: {
          amount_requested?: number
          booking_id?: string
          created_at?: string
          homeowner_profile_id?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          provider_org_id?: string
          reason?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_homeowner_profile_id_fkey"
            columns: ["homeowner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_provider_org_id_fkey"
            columns: ["provider_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          homeowner_profile_id: string
          id: string
          is_verified: boolean | null
          is_visible: boolean | null
          provider_org_id: string
          provider_responded_at: string | null
          provider_response: string | null
          rating: number
          sentiment: string | null
          service_visit_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          homeowner_profile_id: string
          id?: string
          is_verified?: boolean | null
          is_visible?: boolean | null
          provider_org_id: string
          provider_responded_at?: string | null
          provider_response?: string | null
          rating: number
          sentiment?: string | null
          service_visit_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          homeowner_profile_id?: string
          id?: string
          is_verified?: boolean | null
          is_visible?: boolean | null
          provider_org_id?: string
          provider_responded_at?: string | null
          provider_response?: string | null
          rating?: number
          sentiment?: string | null
          service_visit_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_homeowner_profile_id_fkey"
            columns: ["homeowner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_org_id_fkey"
            columns: ["provider_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "service_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards_ledger: {
        Row: {
          amount: number | null
          applied_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          meta: Json | null
          notes: string | null
          profile_id: string
          qualified_at: string | null
          redeemed_at: string | null
          reward_tier: string | null
          reward_type: string
          role: string
          status: string | null
        }
        Insert: {
          amount?: number | null
          applied_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          meta?: Json | null
          notes?: string | null
          profile_id: string
          qualified_at?: string | null
          redeemed_at?: string | null
          reward_tier?: string | null
          reward_type: string
          role: string
          status?: string | null
        }
        Update: {
          amount?: number | null
          applied_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          meta?: Json | null
          notes?: string | null
          profile_id?: string
          qualified_at?: string | null
          redeemed_at?: string | null
          reward_tier?: string | null
          reward_type?: string
          role?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "referral_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action: string
          id: string
          ip_address: string | null
          method: string | null
          success: boolean | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          id?: string
          ip_address?: string | null
          method?: string | null
          success?: boolean | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          ip_address?: string | null
          method?: string | null
          success?: boolean | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      service_call_geofences: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          latitude: number
          longitude: number
          radius_meters: number | null
          service_call_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude: number
          longitude: number
          radius_meters?: number | null
          service_call_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number
          longitude?: number
          radius_meters?: number | null
          service_call_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_call_geofences_service_call_id_fkey"
            columns: ["service_call_id"]
            isOneToOne: false
            referencedRelation: "service_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      service_call_location_history: {
        Row: {
          accuracy: number | null
          created_at: string
          geofence_event: string | null
          id: string
          latitude: number
          longitude: number
          service_call_id: string
          timestamp: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          geofence_event?: string | null
          id?: string
          latitude: number
          longitude: number
          service_call_id: string
          timestamp?: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          geofence_event?: string | null
          id?: string
          latitude?: number
          longitude?: number
          service_call_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_call_location_history_service_call_id_fkey"
            columns: ["service_call_id"]
            isOneToOne: false
            referencedRelation: "service_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      service_calls: {
        Row: {
          assigned_team_member_id: string | null
          completed_at: string | null
          converted_to_booking_id: string | null
          created_at: string
          diagnosis_summary: string | null
          diagnostic_fee: number
          fee_paid: boolean | null
          generated_quote_id: string | null
          home_id: string
          homeowner_id: string
          id: string
          payment_id: string | null
          photos: Json | null
          provider_org_id: string
          recommended_actions: Json | null
          scheduled_date: string | null
          service_request_id: string | null
          status: string
          technician_notes: string | null
          updated_at: string
        }
        Insert: {
          assigned_team_member_id?: string | null
          completed_at?: string | null
          converted_to_booking_id?: string | null
          created_at?: string
          diagnosis_summary?: string | null
          diagnostic_fee: number
          fee_paid?: boolean | null
          generated_quote_id?: string | null
          home_id: string
          homeowner_id: string
          id?: string
          payment_id?: string | null
          photos?: Json | null
          provider_org_id: string
          recommended_actions?: Json | null
          scheduled_date?: string | null
          service_request_id?: string | null
          status?: string
          technician_notes?: string | null
          updated_at?: string
        }
        Update: {
          assigned_team_member_id?: string | null
          completed_at?: string | null
          converted_to_booking_id?: string | null
          created_at?: string
          diagnosis_summary?: string | null
          diagnostic_fee?: number
          fee_paid?: boolean | null
          generated_quote_id?: string | null
          home_id?: string
          homeowner_id?: string
          id?: string
          payment_id?: string | null
          photos?: Json | null
          provider_org_id?: string
          recommended_actions?: Json | null
          scheduled_date?: string | null
          service_request_id?: string | null
          status?: string
          technician_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_calls_assigned_team_member_id_fkey"
            columns: ["assigned_team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_converted_to_booking_id_fkey"
            columns: ["converted_to_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_generated_quote_id_fkey"
            columns: ["generated_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_provider_org_id_fkey"
            columns: ["provider_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
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
          service_type: string[] | null
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
          service_type?: string[] | null
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
          service_type?: string[] | null
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
          ai_metadata: Json | null
          ai_scope_json: Json | null
          ai_summary: string | null
          completed_at: string | null
          confidence_score: number | null
          created_at: string
          description: string | null
          estimated_max_cost: number | null
          estimated_min_cost: number | null
          estimated_price: number | null
          final_price: number | null
          home_id: string
          homeowner_id: string
          id: string
          likely_cause: string | null
          matched_providers: Json | null
          notes: string | null
          preferred_date: string | null
          provider_org_id: string | null
          scheduled_date: string | null
          service_type: string
          severity_level: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_metadata?: Json | null
          ai_scope_json?: Json | null
          ai_summary?: string | null
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          estimated_max_cost?: number | null
          estimated_min_cost?: number | null
          estimated_price?: number | null
          final_price?: number | null
          home_id: string
          homeowner_id: string
          id?: string
          likely_cause?: string | null
          matched_providers?: Json | null
          notes?: string | null
          preferred_date?: string | null
          provider_org_id?: string | null
          scheduled_date?: string | null
          service_type: string
          severity_level?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_metadata?: Json | null
          ai_scope_json?: Json | null
          ai_summary?: string | null
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          estimated_max_cost?: number | null
          estimated_min_cost?: number | null
          estimated_price?: number | null
          final_price?: number | null
          home_id?: string
          homeowner_id?: string
          id?: string
          likely_cause?: string | null
          matched_providers?: Json | null
          notes?: string | null
          preferred_date?: string | null
          provider_org_id?: string | null
          scheduled_date?: string | null
          service_type?: string
          severity_level?: string | null
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
      service_tags: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      service_visits: {
        Row: {
          arrival_time: string | null
          cancelation_reason: string | null
          canceled_by: string | null
          completion_notes: string | null
          completion_photos: Json | null
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
          technician_notes: string | null
          updated_at: string
        }
        Insert: {
          arrival_time?: string | null
          cancelation_reason?: string | null
          canceled_by?: string | null
          completion_notes?: string | null
          completion_photos?: Json | null
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
          technician_notes?: string | null
          updated_at?: string
        }
        Update: {
          arrival_time?: string | null
          cancelation_reason?: string | null
          canceled_by?: string | null
          completion_notes?: string | null
          completion_photos?: Json | null
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
          technician_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_visits_canceled_by_fkey"
            columns: ["canceled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      services: {
        Row: {
          billing_frequency: string | null
          category: string | null
          created_at: string | null
          default_price: number | null
          description: string | null
          duration_max_minutes: number | null
          duration_min_minutes: number | null
          estimated_duration_minutes: number | null
          id: string
          includes_features: string[] | null
          is_active: boolean | null
          is_recurring: boolean | null
          labor_price: number | null
          materials_price: number | null
          name: string
          organization_id: string
          price_max: number | null
          price_min: number | null
          pricing_type: string | null
          required_skills: string[] | null
          updated_at: string | null
        }
        Insert: {
          billing_frequency?: string | null
          category?: string | null
          created_at?: string | null
          default_price?: number | null
          description?: string | null
          duration_max_minutes?: number | null
          duration_min_minutes?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          includes_features?: string[] | null
          is_active?: boolean | null
          is_recurring?: boolean | null
          labor_price?: number | null
          materials_price?: number | null
          name: string
          organization_id: string
          price_max?: number | null
          price_min?: number | null
          pricing_type?: string | null
          required_skills?: string[] | null
          updated_at?: string | null
        }
        Update: {
          billing_frequency?: string | null
          category?: string | null
          created_at?: string | null
          default_price?: number | null
          description?: string | null
          duration_max_minutes?: number | null
          duration_min_minutes?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          includes_features?: string[] | null
          is_active?: boolean | null
          is_recurring?: boolean | null
          labor_price?: number | null
          materials_price?: number | null
          name?: string
          organization_id?: string
          price_max?: number | null
          price_min?: number | null
          pricing_type?: string | null
          required_skills?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      short_link_clicks: {
        Row: {
          clicked_at: string
          country: string | null
          device_type: string | null
          id: string
          ip: unknown
          referrer: string | null
          region: string | null
          short_link_id: string
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          clicked_at?: string
          country?: string | null
          device_type?: string | null
          id?: string
          ip?: unknown
          referrer?: string | null
          region?: string | null
          short_link_id: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          clicked_at?: string
          country?: string | null
          device_type?: string | null
          id?: string
          ip?: unknown
          referrer?: string | null
          region?: string | null
          short_link_id?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "short_link_clicks_short_link_id_fkey"
            columns: ["short_link_id"]
            isOneToOne: false
            referencedRelation: "short_links"
            referencedColumns: ["id"]
          },
        ]
      }
      short_links: {
        Row: {
          created_at: string
          created_by: string | null
          domain: string
          id: string
          is_active: boolean
          is_default: boolean | null
          og_description: string | null
          og_image_url: string | null
          og_title: string | null
          org_id: string
          slug: string
          target_url: string
          theme_color: string | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          domain?: string
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          org_id: string
          slug: string
          target_url: string
          theme_color?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          domain?: string
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          org_id?: string
          slug?: string
          target_url?: string
          theme_color?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "short_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_debug_logs: {
        Row: {
          created_at: string | null
          email: string | null
          error: string | null
          id: string
          stage: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          error?: string | null
          id?: string
          stage: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          error?: string | null
          id?: string
          stage?: string
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          processed_at: string | null
          raw_event: Json | null
          stripe_event_id: string
          webhook_source: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          processed_at?: string | null
          raw_event?: Json | null
          stripe_event_id: string
          webhook_source?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          processed_at?: string | null
          raw_event?: Json | null
          stripe_event_id?: string
          webhook_source?: string | null
        }
        Relationships: []
      }
      stripe_payouts: {
        Row: {
          amount_cents: number
          arrival_date: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          fee_cents: number | null
          id: string
          organization_id: string | null
          payout_type: string | null
          status: string
          stripe_payout_id: string
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          arrival_date?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          fee_cents?: number | null
          id?: string
          organization_id?: string | null
          payout_type?: string | null
          status: string
          stripe_payout_id: string
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          arrival_date?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          fee_cents?: number | null
          id?: string
          organization_id?: string | null
          payout_type?: string | null
          status?: string
          stripe_payout_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_payouts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string | null
          description: string
          id: string
          priority: string | null
          profile_id: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          ticket_number: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description: string
          id?: string
          priority?: string | null
          profile_id?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          ticket_number?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description?: string
          id?: string
          priority?: string | null
          profile_id?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          ticket_number?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_compensation: {
        Row: {
          account_number_encrypted: string | null
          bank_account_last4: string | null
          created_at: string
          direct_deposit_enabled: boolean | null
          effective_date: string
          id: string
          organization_id: string
          pay_rate: number
          pay_type: string
          routing_number_encrypted: string | null
          team_member_id: string
          updated_at: string
        }
        Insert: {
          account_number_encrypted?: string | null
          bank_account_last4?: string | null
          created_at?: string
          direct_deposit_enabled?: boolean | null
          effective_date?: string
          id?: string
          organization_id: string
          pay_rate: number
          pay_type: string
          routing_number_encrypted?: string | null
          team_member_id: string
          updated_at?: string
        }
        Update: {
          account_number_encrypted?: string | null
          bank_account_last4?: string | null
          created_at?: string
          direct_deposit_enabled?: boolean | null
          effective_date?: string
          id?: string
          organization_id?: string
          pay_rate?: number
          pay_type?: string
          routing_number_encrypted?: string | null
          team_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_compensation_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_compensation_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_at: string
          invited_email: string
          organization_id: string
          permissions: Json | null
          role: string
          status: string
          team_role: Database["public"]["Enums"]["team_role"] | null
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
          permissions?: Json | null
          role?: string
          status?: string
          team_role?: Database["public"]["Enums"]["team_role"] | null
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
          permissions?: Json | null
          role?: string
          status?: string
          team_role?: Database["public"]["Enums"]["team_role"] | null
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
      timesheets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          break_minutes: number | null
          clock_in: string
          clock_out: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          service_visit_id: string | null
          status: string
          team_member_id: string
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          break_minutes?: number | null
          clock_in: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          service_visit_id?: string | null
          status?: string
          team_member_id: string
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          break_minutes?: number | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          service_visit_id?: string | null
          status?: string
          team_member_id?: string
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "service_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
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
      trial_reminders_sent: {
        Row: {
          id: string
          reminder_type: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          reminder_type: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          reminder_type?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tutorial_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          role: string
          skipped: boolean | null
          step_id: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          role: string
          skipped?: boolean | null
          step_id?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          role?: string
          skipped?: boolean | null
          step_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_progress_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "tutorial_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_steps: {
        Row: {
          action_required: boolean | null
          completion_criteria: Json | null
          created_at: string | null
          description: string | null
          element_selector: string | null
          id: string
          position: string | null
          role: string
          screenshot_url: string | null
          step_order: number
          title: string
          video_url: string | null
        }
        Insert: {
          action_required?: boolean | null
          completion_criteria?: Json | null
          created_at?: string | null
          description?: string | null
          element_selector?: string | null
          id?: string
          position?: string | null
          role: string
          screenshot_url?: string | null
          step_order: number
          title: string
          video_url?: string | null
        }
        Update: {
          action_required?: boolean | null
          completion_criteria?: Json | null
          created_at?: string | null
          description?: string | null
          element_selector?: string | null
          id?: string
          position?: string | null
          role?: string
          screenshot_url?: string | null
          step_order?: number
          title?: string
          video_url?: string | null
        }
        Relationships: []
      }
      typing_states: {
        Row: {
          conversation_id: string
          is_typing: boolean | null
          last_typed_at: string | null
          profile_id: string
        }
        Insert: {
          conversation_id: string
          is_typing?: boolean | null
          last_typed_at?: string | null
          profile_id: string
        }
        Update: {
          conversation_id?: string
          is_typing?: boolean | null
          last_typed_at?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_states_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_states_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          marketing_consent: boolean | null
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
          marketing_consent?: boolean | null
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
          marketing_consent?: boolean | null
          notified?: boolean | null
          phone?: string
          referral_source?: string | null
          service_type?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      weekly_digest_logs: {
        Row: {
          email_status: string | null
          id: string
          sent_at: string | null
          total_amount_cents: number | null
          total_payouts: number | null
          user_id: string | null
          week_end: string
          week_start: string
        }
        Insert: {
          email_status?: string | null
          id?: string
          sent_at?: string | null
          total_amount_cents?: number | null
          total_payouts?: number | null
          user_id?: string | null
          week_end: string
          week_start: string
        }
        Update: {
          email_status?: string | null
          id?: string
          sent_at?: string | null
          total_amount_cents?: number | null
          total_payouts?: number | null
          user_id?: string | null
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      workflow_states: {
        Row: {
          booking_id: string | null
          created_at: string
          homeowner_id: string
          homeowner_notified_at: string | null
          id: string
          invoice_id: string | null
          payment_id: string | null
          provider_notified_at: string | null
          provider_org_id: string | null
          quote_id: string | null
          service_call_id: string | null
          service_request_id: string | null
          stage_completed_at: string | null
          stage_started_at: string
          updated_at: string
          workflow_stage: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          homeowner_id: string
          homeowner_notified_at?: string | null
          id?: string
          invoice_id?: string | null
          payment_id?: string | null
          provider_notified_at?: string | null
          provider_org_id?: string | null
          quote_id?: string | null
          service_call_id?: string | null
          service_request_id?: string | null
          stage_completed_at?: string | null
          stage_started_at?: string
          updated_at?: string
          workflow_stage: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          homeowner_id?: string
          homeowner_notified_at?: string | null
          id?: string
          invoice_id?: string | null
          payment_id?: string | null
          provider_notified_at?: string | null
          provider_org_id?: string | null
          quote_id?: string | null
          service_call_id?: string | null
          service_request_id?: string | null
          stage_completed_at?: string | null
          stage_started_at?: string
          updated_at?: string
          workflow_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_states_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_states_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_states_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_states_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_states_provider_org_id_fkey"
            columns: ["provider_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_states_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_states_service_call_id_fkey"
            columns: ["service_call_id"]
            isOneToOne: false
            referencedRelation: "service_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_states_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_credit_expenses: {
        Row: {
          credits_issued: number | null
          credits_redeemed: number | null
          expense_realized: number | null
          month: string | null
          outstanding_liability: number | null
          total_expense: number | null
        }
        Relationships: []
      }
      admin_referral_stats: {
        Row: {
          credits_issued: number | null
          discounts_issued: number | null
          total_credit_value: number | null
          total_eligible: number | null
          total_events: number | null
          total_profiles: number | null
          total_referrals: number | null
        }
        Relationships: []
      }
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
      accept_admin_invite: {
        Args: { invite_email: string }
        Returns: undefined
      }
      admin_exists: { Args: never; Returns: boolean }
      apply_service_credit: {
        Args: { subscription_id: string; user_profile_id: string }
        Returns: Json
      }
      can_accept_invite: { Args: { _user_id: string }; Returns: boolean }
      check_admin_invite: {
        Args: { invite_email: string }
        Returns: {
          full_name: string
          phone: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }[]
      }
      check_and_create_booking: {
        Args: {
          p_address: string
          p_date_time_end: string
          p_date_time_start: string
          p_home_id?: string
          p_homeowner_profile_id: string
          p_notes?: string
          p_provider_org_id: string
          p_service_name: string
        }
        Returns: Json
      }
      check_beta_access: {
        Args: { account_type: string; user_email: string }
        Returns: boolean
      }
      check_provider_availability: {
        Args: {
          p_end_time: string
          p_provider_id: string
          p_start_time: string
        }
        Returns: boolean
      }
      generate_referral_code: { Args: never; Returns: string }
      get_user_email: { Args: never; Returns: string }
      get_user_id_by_email: { Args: { user_email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_referral_count: {
        Args: { ref_code: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_in_trial: { Args: { user_profile_id: string }; Returns: boolean }
      is_org_member: {
        Args: { org_id: string; user_id: string }
        Returns: boolean
      }
      match_providers: {
        Args: { p_home_id: string; p_limit?: number; p_service_type: string }
        Returns: {
          distance_miles: number
          match_score: number
          provider_org_id: string
          trust_score: number
        }[]
      }
      payments_kpis: { Args: { org_uuid: string }; Returns: Json }
      reset_unread_count: {
        Args: { conv_id: string; user_type: string }
        Returns: undefined
      }
      send_message: {
        Args: {
          p_attachment_url?: string
          p_content: string
          p_conversation_id: string
          p_message_type?: string
          p_meta?: Json
          p_sender_profile_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      chat_role: "user" | "assistant" | "tool"
      subscription_tier: "free" | "growth" | "pro" | "scale"
      team_role: "owner" | "manager" | "technician" | "admin"
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
      chat_role: ["user", "assistant", "tool"],
      subscription_tier: ["free", "growth", "pro", "scale"],
      team_role: ["owner", "manager", "technician", "admin"],
    },
  },
} as const
