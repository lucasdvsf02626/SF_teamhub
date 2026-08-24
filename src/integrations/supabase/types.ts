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
      bridge_inbound_idempotency_keys: {
        Row: {
          expires_at: string
          first_seen_at: string
          key: string
          request_hash: string
          response_json: Json
          response_status: number
          source: string
        }
        Insert: {
          expires_at?: string
          first_seen_at?: string
          key: string
          request_hash: string
          response_json: Json
          response_status: number
          source: string
        }
        Update: {
          expires_at?: string
          first_seen_at?: string
          key?: string
          request_hash?: string
          response_json?: Json
          response_status?: number
          source?: string
        }
        Relationships: []
      }
      certification_reminders_sent: {
        Row: {
          certification_id: string
          id: string
          reminder_type: string
          sent_at: string | null
        }
        Insert: {
          certification_id: string
          id?: string
          reminder_type: string
          sent_at?: string | null
        }
        Update: {
          certification_id?: string
          id?: string
          reminder_type?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certification_reminders_sent_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "user_certifications"
            referencedColumns: ["id"]
          },
        ]
      }
      client_error_logs: {
        Row: {
          component_stack: string | null
          context: string
          created_at: string
          error_message: string
          error_stack: string | null
          extra_data: Json | null
          id: string
          url: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component_stack?: string | null
          context?: string
          created_at?: string
          error_message: string
          error_stack?: string | null
          extra_data?: Json | null
          id?: string
          url: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component_stack?: string | null
          context?: string
          created_at?: string
          error_message?: string
          error_stack?: string | null
          extra_data?: Json | null
          id?: string
          url?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      email_broadcasts: {
        Row: {
          failed_count: number | null
          id: string
          message: string
          recipient_count: number
          sent_at: string | null
          sent_by: string
          subject: string
          successful_count: number
          template_id: string | null
        }
        Insert: {
          failed_count?: number | null
          id?: string
          message: string
          recipient_count: number
          sent_at?: string | null
          sent_by: string
          subject: string
          successful_count: number
          template_id?: string | null
        }
        Update: {
          failed_count?: number | null
          id?: string
          message?: string
          recipient_count?: number
          sent_at?: string | null
          sent_by?: string
          subject?: string
          successful_count?: number
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_broadcasts_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_broadcasts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          category: string
          created_at: string | null
          created_by: string | null
          id: string
          is_system: boolean | null
          name: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          body: string
          category: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          category?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      error_analyses: {
        Row: {
          category: string | null
          code_example: string | null
          created_at: string | null
          error_log_id: string | null
          id: string
          is_resolved: boolean | null
          prevention_tips: string | null
          resolved_at: string | null
          resolved_by: string | null
          root_cause: string | null
          severity: string
          suggested_fix: string | null
        }
        Insert: {
          category?: string | null
          code_example?: string | null
          created_at?: string | null
          error_log_id?: string | null
          id?: string
          is_resolved?: boolean | null
          prevention_tips?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          severity: string
          suggested_fix?: string | null
        }
        Update: {
          category?: string | null
          code_example?: string | null
          created_at?: string | null
          error_log_id?: string | null
          id?: string
          is_resolved?: boolean | null
          prevention_tips?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          severity?: string
          suggested_fix?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_analyses_error_log_id_fkey"
            columns: ["error_log_id"]
            isOneToOne: false
            referencedRelation: "client_error_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_analyses_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hivemail_inbound_seen_events: {
        Row: {
          event_id: string
          event_type: string
          payload: Json | null
          received_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          payload?: Json | null
          received_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          payload?: Json | null
          received_at?: string
        }
        Relationships: []
      }
      hivemail_messages_local: {
        Row: {
          attachments: Json
          body: string
          created_at: string
          edited_at: string | null
          id: string
          sender_email: string
          sync_source: string | null
          thread_id: string
        }
        Insert: {
          attachments?: Json
          body: string
          created_at?: string
          edited_at?: string | null
          id: string
          sender_email: string
          sync_source?: string | null
          thread_id: string
        }
        Update: {
          attachments?: Json
          body?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          sender_email?: string
          sync_source?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hivemail_messages_local_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "hivemail_threads_local"
            referencedColumns: ["id"]
          },
        ]
      }
      hivemail_outbox: {
        Row: {
          attempt_count: number
          correlation_id: string
          created_at: string
          id: string
          idempotency_key: string
          last_error: string | null
          op_type: string
          payload: Json
          status: string
          updated_at: string
          user_email: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          correlation_id?: string
          created_at?: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          op_type: string
          payload: Json
          status?: string
          updated_at?: string
          user_email: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          correlation_id?: string
          created_at?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          op_type?: string
          payload?: Json
          status?: string
          updated_at?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      hivemail_receipts_local: {
        Row: {
          delivered_at: string | null
          id: string
          message_id: string
          read_at: string | null
          recipient_email: string
          updated_at: string
        }
        Insert: {
          delivered_at?: string | null
          id?: string
          message_id: string
          read_at?: string | null
          recipient_email: string
          updated_at?: string
        }
        Update: {
          delivered_at?: string | null
          id?: string
          message_id?: string
          read_at?: string | null
          recipient_email?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hivemail_receipts_local_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "hivemail_messages_local"
            referencedColumns: ["id"]
          },
        ]
      }
      hivemail_thread_participants_local: {
        Row: {
          id: string
          joined_at: string
          role: string
          sync_source: string | null
          thread_id: string
          user_email: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          sync_source?: string | null
          thread_id: string
          user_email: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          sync_source?: string | null
          thread_id?: string
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "hivemail_thread_participants_local_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "hivemail_threads_local"
            referencedColumns: ["id"]
          },
        ]
      }
      hivemail_threads_local: {
        Row: {
          created_at: string
          id: string
          kind: string
          last_message_at: string | null
          last_message_preview: string | null
          sync_source: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          kind: string
          last_message_at?: string | null
          last_message_preview?: string | null
          sync_source?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          sync_source?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          bradford_alert_enabled: boolean
          created_at: string
          email_enabled: boolean
          haptic_enabled: boolean
          id: string
          leave_approved: boolean
          leave_rejected: boolean
          leave_submitted: boolean
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          bradford_alert_enabled?: boolean
          created_at?: string
          email_enabled?: boolean
          haptic_enabled?: boolean
          id?: string
          leave_approved?: boolean
          leave_rejected?: boolean
          leave_submitted?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          bradford_alert_enabled?: boolean
          created_at?: string
          email_enabled?: boolean
          haptic_enabled?: boolean
          id?: string
          leave_approved?: boolean
          leave_rejected?: boolean
          leave_submitted?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          requested_ip: string | null
          token_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          requested_ip?: string | null
          token_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          requested_ip?: string | null
          token_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pending_imports: {
        Row: {
          activated_profile_id: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          department: string | null
          email: string | null
          employer: string | null
          first_name: string
          id: string
          job_title: string | null
          notes: string | null
          payroll_id: string | null
          start_date: string | null
          status: string
          surname: string
          updated_at: string
        }
        Insert: {
          activated_profile_id?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          department?: string | null
          email?: string | null
          employer?: string | null
          first_name: string
          id?: string
          job_title?: string | null
          notes?: string | null
          payroll_id?: string | null
          start_date?: string | null
          status?: string
          surname: string
          updated_at?: string
        }
        Update: {
          activated_profile_id?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          department?: string | null
          email?: string | null
          employer?: string | null
          first_name?: string
          id?: string
          job_title?: string | null
          notes?: string | null
          payroll_id?: string | null
          start_date?: string | null
          status?: string
          surname?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_imports_activated_profile_id_fkey"
            columns: ["activated_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_imports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_versions: {
        Row: {
          changed_by: string
          created_at: string
          email: string | null
          id: string
          profile_id: string
          snapshot: Json
        }
        Insert: {
          changed_by: string
          created_at?: string
          email?: string | null
          id?: string
          profile_id: string
          snapshot: Json
        }
        Update: {
          changed_by?: string
          created_at?: string
          email?: string | null
          id?: string
          profile_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "profile_versions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          archived_at: string | null
          auto_signin_enabled: boolean
          avatar_url: string | null
          bio: string | null
          birthday: string | null
          company: string | null
          country_code: string | null
          created_at: string
          default_pay_code_id: string | null
          department: string | null
          department_id: string | null
          display_name: string | null
          email: string | null
          employee_number: string | null
          first_name: string | null
          id: string
          job_title: string | null
          languages: string[] | null
          last_synced_at: string | null
          must_change_password: boolean | null
          payroll_id: string | null
          permission_level: number | null
          phone: string | null
          pin: string | null
          reports_to: string | null
          start_date: string | null
          surname: string | null
          sync_source: string | null
          updated_at: string
          work_city: string | null
          work_country_code: string | null
        }
        Insert: {
          archived_at?: string | null
          auto_signin_enabled?: boolean
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          company?: string | null
          country_code?: string | null
          created_at?: string
          default_pay_code_id?: string | null
          department?: string | null
          department_id?: string | null
          display_name?: string | null
          email?: string | null
          employee_number?: string | null
          first_name?: string | null
          id: string
          job_title?: string | null
          languages?: string[] | null
          last_synced_at?: string | null
          must_change_password?: boolean | null
          payroll_id?: string | null
          permission_level?: number | null
          phone?: string | null
          pin?: string | null
          reports_to?: string | null
          start_date?: string | null
          surname?: string | null
          sync_source?: string | null
          updated_at?: string
          work_city?: string | null
          work_country_code?: string | null
        }
        Update: {
          archived_at?: string | null
          auto_signin_enabled?: boolean
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          company?: string | null
          country_code?: string | null
          created_at?: string
          default_pay_code_id?: string | null
          department?: string | null
          department_id?: string | null
          display_name?: string | null
          email?: string | null
          employee_number?: string | null
          first_name?: string | null
          id?: string
          job_title?: string | null
          languages?: string[] | null
          last_synced_at?: string | null
          must_change_password?: boolean | null
          payroll_id?: string | null
          permission_level?: number | null
          phone?: string | null
          pin?: string | null
          reports_to?: string | null
          start_date?: string | null
          surname?: string | null
          sync_source?: string | null
          updated_at?: string
          work_city?: string | null
          work_country_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_pay_code_id_fkey"
            columns: ["default_pay_code_id"]
            isOneToOne: false
            referencedRelation: "teamhub_pay_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "teamhub_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      return_to_work_forms: {
        Row: {
          adjustments_needed: string | null
          completed_at: string | null
          created_at: string | null
          feeling_well: boolean
          id: string
          leave_request_id: string
          medical_clearance: boolean | null
          notes: string | null
          ongoing_concerns: string | null
          return_date: string
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          adjustments_needed?: string | null
          completed_at?: string | null
          created_at?: string | null
          feeling_well?: boolean
          id?: string
          leave_request_id: string
          medical_clearance?: boolean | null
          notes?: string | null
          ongoing_concerns?: string | null
          return_date: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          adjustments_needed?: string | null
          completed_at?: string | null
          created_at?: string | null
          feeling_well?: boolean
          id?: string
          leave_request_id?: string
          medical_clearance?: boolean | null
          notes?: string | null
          ongoing_concerns?: string | null
          return_date?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_to_work_forms_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: true
            referencedRelation: "teamhub_leave_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_tier_config: {
        Row: {
          base_annual_leave: number
          created_at: string | null
          id: string
          max_years: number | null
          min_years: number
          tier_color: string
          tier_name: string
          updated_at: string | null
        }
        Insert: {
          base_annual_leave: number
          created_at?: string | null
          id?: string
          max_years?: number | null
          min_years: number
          tier_color: string
          tier_name: string
          updated_at?: string | null
        }
        Update: {
          base_annual_leave?: number
          created_at?: string | null
          id?: string
          max_years?: number | null
          min_years?: number
          tier_color?: string
          tier_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      sync_events: {
        Row: {
          action: string
          created_at: string
          direction: string
          duration_ms: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          profile_email: string | null
          profile_id: string | null
          response_code: number | null
          source_system: string
          status: string
          target_system: string
        }
        Insert: {
          action: string
          created_at?: string
          direction: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          profile_email?: string | null
          profile_id?: string | null
          response_code?: number | null
          source_system: string
          status: string
          target_system: string
        }
        Update: {
          action?: string
          created_at?: string
          direction?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          profile_email?: string | null
          profile_id?: string | null
          response_code?: number | null
          source_system?: string
          status?: string
          target_system?: string
        }
        Relationships: []
      }
      sync_schedule_settings: {
        Row: {
          cron_interval: string
          id: string
          interval_label: string
          is_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cron_interval?: string
          id?: string
          interval_label?: string
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cron_interval?: string
          id?: string
          interval_label?: string
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_schedule_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teamhub_attendance_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          location_metadata: Json | null
          recorded_at: string
          site: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          location_metadata?: Json | null
          recorded_at?: string
          site: string
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          location_metadata?: Json | null
          recorded_at?: string
          site?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      teamhub_attendance_reconciliation_v2: {
        Row: {
          actual_first_in_at: string | null
          actual_last_out_at: string | null
          attendance_date: string
          early_leave_minutes: number
          exception_reason: string | null
          exception_status: Database["public"]["Enums"]["attendance_exception_status"]
          expected_end_at: string | null
          expected_minutes: number
          expected_start_at: string | null
          generated_at: string
          id: string
          lateness_minutes: number
          override_at: string | null
          override_by: string | null
          override_note: string | null
          overtime_minutes_raw: number
          policy_id: string | null
          primary_site: string | null
          regular_minutes: number
          schedule_source: string
          schedule_window_count: number
          source: string
          source_version: string
          unpaid_break_minutes: number
          user_email: string | null
          user_id: string
          worked_minutes: number
        }
        Insert: {
          actual_first_in_at?: string | null
          actual_last_out_at?: string | null
          attendance_date: string
          early_leave_minutes?: number
          exception_reason?: string | null
          exception_status: Database["public"]["Enums"]["attendance_exception_status"]
          expected_end_at?: string | null
          expected_minutes?: number
          expected_start_at?: string | null
          generated_at?: string
          id?: string
          lateness_minutes?: number
          override_at?: string | null
          override_by?: string | null
          override_note?: string | null
          overtime_minutes_raw?: number
          policy_id?: string | null
          primary_site?: string | null
          regular_minutes?: number
          schedule_source: string
          schedule_window_count?: number
          source?: string
          source_version: string
          unpaid_break_minutes?: number
          user_email?: string | null
          user_id: string
          worked_minutes?: number
        }
        Update: {
          actual_first_in_at?: string | null
          actual_last_out_at?: string | null
          attendance_date?: string
          early_leave_minutes?: number
          exception_reason?: string | null
          exception_status?: Database["public"]["Enums"]["attendance_exception_status"]
          expected_end_at?: string | null
          expected_minutes?: number
          expected_start_at?: string | null
          generated_at?: string
          id?: string
          lateness_minutes?: number
          override_at?: string | null
          override_by?: string | null
          override_note?: string | null
          overtime_minutes_raw?: number
          policy_id?: string | null
          primary_site?: string | null
          regular_minutes?: number
          schedule_source?: string
          schedule_window_count?: number
          source?: string
          source_version?: string
          unpaid_break_minutes?: number
          user_email?: string | null
          user_id?: string
          worked_minutes?: number
        }
        Relationships: []
      }
      teamhub_attendance_reconciliations: {
        Row: {
          anomalies: string[]
          assignment_id: string | null
          break_minutes: number
          computed_at: string
          date: string
          expected_minutes: number
          first_sign_in: string | null
          id: string
          last_sign_out: string | null
          metadata: Json
          overtime_minutes: number
          pattern_id: string | null
          policy_id: string | null
          primary_site: string | null
          source: string
          status: string
          user_email: string | null
          user_id: string
          worked_minutes: number
        }
        Insert: {
          anomalies?: string[]
          assignment_id?: string | null
          break_minutes?: number
          computed_at?: string
          date: string
          expected_minutes?: number
          first_sign_in?: string | null
          id?: string
          last_sign_out?: string | null
          metadata?: Json
          overtime_minutes?: number
          pattern_id?: string | null
          policy_id?: string | null
          primary_site?: string | null
          source?: string
          status: string
          user_email?: string | null
          user_id: string
          worked_minutes?: number
        }
        Update: {
          anomalies?: string[]
          assignment_id?: string | null
          break_minutes?: number
          computed_at?: string
          date?: string
          expected_minutes?: number
          first_sign_in?: string | null
          id?: string
          last_sign_out?: string | null
          metadata?: Json
          overtime_minutes?: number
          pattern_id?: string | null
          policy_id?: string | null
          primary_site?: string | null
          source?: string
          status?: string
          user_email?: string | null
          user_id?: string
          worked_minutes?: number
        }
        Relationships: []
      }
      teamhub_attendance_summaries: {
        Row: {
          anomaly_count: number
          computed_at: string
          days_expected: number
          days_no_show: number
          days_partial: number
          days_worked: number
          expected_minutes: number
          id: string
          metadata: Json
          overtime_minutes: number
          period_end: string
          period_start: string
          period_type: string
          reconciliation_ids: string[]
          source: string
          user_email: string | null
          user_id: string
          worked_minutes: number
        }
        Insert: {
          anomaly_count?: number
          computed_at?: string
          days_expected?: number
          days_no_show?: number
          days_partial?: number
          days_worked?: number
          expected_minutes?: number
          id?: string
          metadata?: Json
          overtime_minutes?: number
          period_end: string
          period_start: string
          period_type: string
          reconciliation_ids?: string[]
          source?: string
          user_email?: string | null
          user_id: string
          worked_minutes?: number
        }
        Update: {
          anomaly_count?: number
          computed_at?: string
          days_expected?: number
          days_no_show?: number
          days_partial?: number
          days_worked?: number
          expected_minutes?: number
          id?: string
          metadata?: Json
          overtime_minutes?: number
          period_end?: string
          period_start?: string
          period_type?: string
          reconciliation_ids?: string[]
          source?: string
          user_email?: string | null
          user_id?: string
          worked_minutes?: number
        }
        Relationships: []
      }
      teamhub_automation_events: {
        Row: {
          attempt_count: number
          channel: string
          created_at: string
          delivered_at: string | null
          event_type: string
          id: string
          last_error: string | null
          next_attempt_at: string
          payload: Json
          response_code: number | null
          status: string
          target_url: string | null
          updated_at: string
          user_email: string | null
        }
        Insert: {
          attempt_count?: number
          channel: string
          created_at?: string
          delivered_at?: string | null
          event_type: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload: Json
          response_code?: number | null
          status?: string
          target_url?: string | null
          updated_at?: string
          user_email?: string | null
        }
        Update: {
          attempt_count?: number
          channel?: string
          created_at?: string
          delivered_at?: string | null
          event_type?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          response_code?: number | null
          status?: string
          target_url?: string | null
          updated_at?: string
          user_email?: string | null
        }
        Relationships: []
      }
      teamhub_bradford_settings: {
        Row: {
          alert_email: string | null
          created_at: string
          id: string
          threshold_alert: number
          threshold_low: number
          threshold_medium: number
          updated_at: string
        }
        Insert: {
          alert_email?: string | null
          created_at?: string
          id?: string
          threshold_alert?: number
          threshold_low?: number
          threshold_medium?: number
          updated_at?: string
        }
        Update: {
          alert_email?: string | null
          created_at?: string
          id?: string
          threshold_alert?: number
          threshold_low?: number
          threshold_medium?: number
          updated_at?: string
        }
        Relationships: []
      }
      teamhub_daily_presence_summary: {
        Row: {
          date: string
          first_sign_in: string | null
          generated_at: string
          id: string
          last_sign_out: string | null
          primary_site: string
          status: string
          total_worked_minutes: number | null
          user_id: string
        }
        Insert: {
          date: string
          first_sign_in?: string | null
          generated_at?: string
          id?: string
          last_sign_out?: string | null
          primary_site: string
          status: string
          total_worked_minutes?: number | null
          user_id: string
        }
        Update: {
          date?: string
          first_sign_in?: string | null
          generated_at?: string
          id?: string
          last_sign_out?: string | null
          primary_site?: string
          status?: string
          total_worked_minutes?: number | null
          user_id?: string
        }
        Relationships: []
      }
      teamhub_departments: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      teamhub_feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          flag_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          flag_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          enabled?: boolean
          flag_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      teamhub_leave_balances: {
        Row: {
          annual_leave_allowance: number
          carry_over_days: number
          created_at: string
          id: string
          sick_day_allowance: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          annual_leave_allowance?: number
          carry_over_days?: number
          created_at?: string
          id?: string
          sick_day_allowance?: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          annual_leave_allowance?: number
          carry_over_days?: number
          created_at?: string
          id?: string
          sick_day_allowance?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "teamhub_leave_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teamhub_leave_requests: {
        Row: {
          certificate_filename: string | null
          certificate_url: string | null
          created_at: string
          end_date: string
          id: string
          reason: string | null
          request_type: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          certificate_filename?: string | null
          certificate_url?: string | null
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          request_type: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          certificate_filename?: string | null
          certificate_url?: string | null
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          request_type?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teamhub_leave_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teamhub_leave_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teamhub_leave_settings: {
        Row: {
          created_at: string | null
          id: string
          leave_year_start_day: number
          leave_year_start_month: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          leave_year_start_day?: number
          leave_year_start_month?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          leave_year_start_day?: number
          leave_year_start_month?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      teamhub_overtime_policies: {
        Row: {
          created_at: string
          created_by: string | null
          daily_threshold_minutes: number
          grace_minutes: number
          id: string
          is_active: boolean
          overtime_multiplier: number
          priority: number
          rounding_minutes: number
          scope: string
          scope_ref: string | null
          updated_at: string
          weekly_threshold_minutes: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          daily_threshold_minutes?: number
          grace_minutes?: number
          id?: string
          is_active?: boolean
          overtime_multiplier?: number
          priority?: number
          rounding_minutes?: number
          scope: string
          scope_ref?: string | null
          updated_at?: string
          weekly_threshold_minutes?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          daily_threshold_minutes?: number
          grace_minutes?: number
          id?: string
          is_active?: boolean
          overtime_multiplier?: number
          priority?: number
          rounding_minutes?: number
          scope?: string
          scope_ref?: string | null
          updated_at?: string
          weekly_threshold_minutes?: number
        }
        Relationships: []
      }
      teamhub_pay_codes: {
        Row: {
          absence_type: string | null
          code: string
          created_at: string
          id: string
          is_absence: boolean
          is_active: boolean
          multiplier: number
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          absence_type?: string | null
          code: string
          created_at?: string
          id?: string
          is_absence?: boolean
          is_active?: boolean
          multiplier?: number
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          absence_type?: string | null
          code?: string
          created_at?: string
          id?: string
          is_absence?: boolean
          is_active?: boolean
          multiplier?: number
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      teamhub_pay_periods: {
        Row: {
          created_at: string
          cutoff_date: string
          end_date: string
          id: string
          locked: boolean
          locked_at: string | null
          locked_by: string | null
          name: string
          source: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cutoff_date: string
          end_date: string
          id?: string
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          name: string
          source?: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cutoff_date?: string
          end_date?: string
          id?: string
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          name?: string
          source?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teamhub_pay_periods_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teamhub_shift_assignment_events: {
        Row: {
          action: string
          actor_user_id: string | null
          after_json: Json | null
          assignment_id: string
          before_json: Json | null
          created_at: string
          id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_json?: Json | null
          assignment_id: string
          before_json?: Json | null
          created_at?: string
          id?: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_json?: Json | null
          assignment_id?: string
          before_json?: Json | null
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      teamhub_shift_assignments: {
        Row: {
          bridged_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          effective_from: string
          effective_to: string | null
          end_at_utc: string | null
          external_id: string | null
          id: string
          notes: string | null
          pattern_id: string | null
          production_line_id: string | null
          production_line_name: string | null
          site_code: string | null
          source: string
          start_at_utc: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bridged_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          effective_from: string
          effective_to?: string | null
          end_at_utc?: string | null
          external_id?: string | null
          id?: string
          notes?: string | null
          pattern_id?: string | null
          production_line_id?: string | null
          production_line_name?: string | null
          site_code?: string | null
          source?: string
          start_at_utc?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bridged_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          effective_from?: string
          effective_to?: string | null
          end_at_utc?: string | null
          external_id?: string | null
          id?: string
          notes?: string | null
          pattern_id?: string | null
          production_line_id?: string | null
          production_line_name?: string | null
          site_code?: string | null
          source?: string
          start_at_utc?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teamhub_shift_assignments_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "teamhub_shift_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      teamhub_shift_patterns: {
        Row: {
          break_minutes: number
          created_at: string
          created_by: string | null
          days_of_week: number[]
          description: string | null
          end_time: string
          expected_minutes: number
          id: string
          is_active: boolean
          name: string
          site_code: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          break_minutes?: number
          created_at?: string
          created_by?: string | null
          days_of_week?: number[]
          description?: string | null
          end_time: string
          expected_minutes: number
          id?: string
          is_active?: boolean
          name: string
          site_code?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          break_minutes?: number
          created_at?: string
          created_by?: string | null
          days_of_week?: number[]
          description?: string | null
          end_time?: string
          expected_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          site_code?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      teamhub_sites: {
        Row: {
          address: string | null
          code: string
          created_at: string
          expected_start_time: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          radius_m: number | null
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          expected_start_time?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          radius_m?: number | null
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          expected_start_time?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          radius_m?: number | null
        }
        Relationships: []
      }
      teamhub_timesheet_entries: {
        Row: {
          absence_type: string | null
          adjustment_hours: number
          adjustment_reason: string | null
          created_at: string
          hours_decimal: number
          id: string
          is_locked: boolean
          notes: string | null
          overtime_hours: number
          overtime_multiplier: number | null
          pay_code_id: string
          pay_period_id: string
          reconciliation_id: string | null
          shift_pattern_id: string | null
          source: string
          updated_at: string
          user_id: string
          work_date: string
        }
        Insert: {
          absence_type?: string | null
          adjustment_hours?: number
          adjustment_reason?: string | null
          created_at?: string
          hours_decimal?: number
          id?: string
          is_locked?: boolean
          notes?: string | null
          overtime_hours?: number
          overtime_multiplier?: number | null
          pay_code_id: string
          pay_period_id: string
          reconciliation_id?: string | null
          shift_pattern_id?: string | null
          source?: string
          updated_at?: string
          user_id: string
          work_date: string
        }
        Update: {
          absence_type?: string | null
          adjustment_hours?: number
          adjustment_reason?: string | null
          created_at?: string
          hours_decimal?: number
          id?: string
          is_locked?: boolean
          notes?: string | null
          overtime_hours?: number
          overtime_multiplier?: number | null
          pay_code_id?: string
          pay_period_id?: string
          reconciliation_id?: string | null
          shift_pattern_id?: string | null
          source?: string
          updated_at?: string
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "teamhub_timesheet_entries_pay_code_id_fkey"
            columns: ["pay_code_id"]
            isOneToOne: false
            referencedRelation: "teamhub_pay_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teamhub_timesheet_entries_pay_period_id_fkey"
            columns: ["pay_period_id"]
            isOneToOne: false
            referencedRelation: "teamhub_pay_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teamhub_timesheet_entries_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "attendance_reconciliation_daily"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teamhub_timesheet_entries_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "teamhub_attendance_reconciliation_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teamhub_timesheet_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teamhub_webhook_endpoints: {
        Row: {
          created_at: string
          created_by: string | null
          event_types: string[]
          id: string
          is_active: boolean
          name: string
          secret_name: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_types?: string[]
          id?: string
          is_active?: boolean
          name: string
          secret_name?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_types?: string[]
          id?: string
          is_active?: boolean
          name?: string
          secret_name?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      user_activation_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_certifications: {
        Row: {
          certificate_number: string | null
          certification_type: Database["public"]["Enums"]["certification_type"]
          created_at: string | null
          created_by: string | null
          expiry_date: string
          id: string
          is_active: boolean | null
          issued_date: string | null
          issuing_authority: string | null
          notes: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          certificate_number?: string | null
          certification_type: Database["public"]["Enums"]["certification_type"]
          created_at?: string | null
          created_by?: string | null
          expiry_date: string
          id?: string
          is_active?: boolean | null
          issued_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          certificate_number?: string | null
          certification_type?: Database["public"]["Enums"]["certification_type"]
          created_at?: string | null
          created_by?: string | null
          expiry_date?: string
          id?: string
          is_active?: boolean | null
          issued_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_certifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      attendance_reconciliation_daily: {
        Row: {
          actual_first_in_at: string | null
          actual_last_out_at: string | null
          attendance_date: string | null
          attendance_events: Json | null
          early_leave_minutes: number | null
          exception_reason: string | null
          exception_status:
            | Database["public"]["Enums"]["attendance_exception_status"]
            | null
          expected_end_at: string | null
          expected_minutes: number | null
          expected_start_at: string | null
          generated_at: string | null
          id: string | null
          lateness_minutes: number | null
          override_at: string | null
          override_by: string | null
          override_note: string | null
          overtime_minutes_raw: number | null
          policy_id: string | null
          primary_site: string | null
          regular_minutes: number | null
          schedule_rows: Json | null
          schedule_source: string | null
          schedule_window_count: number | null
          source: string | null
          source_version: string | null
          unpaid_break_minutes: number | null
          user_email: string | null
          user_id: string | null
          worked_minutes: number | null
        }
        Insert: {
          actual_first_in_at?: string | null
          actual_last_out_at?: string | null
          attendance_date?: string | null
          attendance_events?: never
          early_leave_minutes?: number | null
          exception_reason?: string | null
          exception_status?:
            | Database["public"]["Enums"]["attendance_exception_status"]
            | null
          expected_end_at?: string | null
          expected_minutes?: number | null
          expected_start_at?: string | null
          generated_at?: string | null
          id?: string | null
          lateness_minutes?: number | null
          override_at?: string | null
          override_by?: string | null
          override_note?: string | null
          overtime_minutes_raw?: number | null
          policy_id?: string | null
          primary_site?: string | null
          regular_minutes?: number | null
          schedule_rows?: never
          schedule_source?: string | null
          schedule_window_count?: number | null
          source?: string | null
          source_version?: string | null
          unpaid_break_minutes?: number | null
          user_email?: string | null
          user_id?: string | null
          worked_minutes?: number | null
        }
        Update: {
          actual_first_in_at?: string | null
          actual_last_out_at?: string | null
          attendance_date?: string | null
          attendance_events?: never
          early_leave_minutes?: number | null
          exception_reason?: string | null
          exception_status?:
            | Database["public"]["Enums"]["attendance_exception_status"]
            | null
          expected_end_at?: string | null
          expected_minutes?: number | null
          expected_start_at?: string | null
          generated_at?: string | null
          id?: string | null
          lateness_minutes?: number | null
          override_at?: string | null
          override_by?: string | null
          override_note?: string | null
          overtime_minutes_raw?: number | null
          policy_id?: string | null
          primary_site?: string | null
          regular_minutes?: number | null
          schedule_rows?: never
          schedule_source?: string | null
          schedule_window_count?: number | null
          source?: string | null
          source_version?: string | null
          unpaid_break_minutes?: number | null
          user_email?: string | null
          user_id?: string | null
          worked_minutes?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_view_employee_data: {
        Args: { employee_user_id: string }
        Returns: boolean
      }
      current_user_email: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      exec_sql_admin: { Args: { sql: string }; Returns: undefined }
      get_staff_directory: {
        Args: never
        Returns: {
          avatar_url: string
          bio: string
          birthday_md: string
          department: string
          department_id: string
          display_name: string
          first_name: string
          id: string
          job_title: string
          reports_to: string
          start_date: string
          surname: string
        }[]
      }
      get_user_permission_level: { Args: { user_id: string }; Returns: number }
      is_direct_report: {
        Args: { employee_id: string; manager_id: string }
        Returns: boolean
      }
      is_hivemail_thread_participant: {
        Args: { _thread_id: string; _user_email: string }
        Returns: boolean
      }
      lock_pay_period: {
        Args: { p_period_id: string }
        Returns: {
          created_at: string
          cutoff_date: string
          end_date: string
          id: string
          locked: boolean
          locked_at: string | null
          locked_by: string | null
          name: string
          source: string
          start_date: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "teamhub_pay_periods"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      materialise_pay_period_entries: {
        Args: { p_period_id: string }
        Returns: Json
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      unlock_pay_period: {
        Args: { p_period_id: string }
        Returns: {
          created_at: string
          cutoff_date: string
          end_date: string
          id: string
          locked: boolean
          locked_at: string | null
          locked_by: string | null
          name: string
          source: string
          start_date: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "teamhub_pay_periods"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      attendance_exception_status:
        | "ok"
        | "late"
        | "early_leave"
        | "missing_signin"
        | "missing_signout"
        | "no_schedule"
        | "multi_shift"
        | "override"
      certification_type:
        | "fire_marshal"
        | "first_aider"
        | "forklift_license"
        | "pat_testing"
        | "manual_handling"
        | "food_hygiene"
        | "health_and_safety"
        | "coshh"
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
      attendance_exception_status: [
        "ok",
        "late",
        "early_leave",
        "missing_signin",
        "missing_signout",
        "no_schedule",
        "multi_shift",
        "override",
      ],
      certification_type: [
        "fire_marshal",
        "first_aider",
        "forklift_license",
        "pat_testing",
        "manual_handling",
        "food_hygiene",
        "health_and_safety",
        "coshh",
      ],
    },
  },
} as const
