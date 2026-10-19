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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      age_bands: {
        Row: {
          id: string
          max_age: number | null
          min_age: number
          name: Json
          property_id: string
          sort: number
          tenant_id: string
          tourist_tax_exempt: boolean
        }
        Insert: {
          id?: string
          max_age?: number | null
          min_age: number
          name: Json
          property_id: string
          sort?: number
          tenant_id: string
          tourist_tax_exempt?: boolean
        }
        Update: {
          id?: string
          max_age?: number | null
          min_age?: number
          name?: Json
          property_id?: string
          sort?: number
          tenant_id?: string
          tourist_tax_exempt?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "age_bands_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "age_bands_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          data: Json
          entity: string
          entity_id: string | null
          id: number
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          data?: Json
          entity: string
          entity_id?: string | null
          id?: never
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          data?: Json
          entity?: string
          entity_id?: string | null
          id?: never
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_guests: {
        Row: {
          address: string | null
          birth_date: string | null
          created_at: string
          document_number: string | null
          document_type: string | null
          first_name: string
          id: string
          is_citizen: boolean
          last_name: string
          nationality: string | null
          purged_at: string | null
          reported_at: string | null
          reported_by: string | null
          reservation_id: string
          sort: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          document_number?: string | null
          document_type?: string | null
          first_name: string
          id?: string
          is_citizen?: boolean
          last_name: string
          nationality?: string | null
          purged_at?: string | null
          reported_at?: string | null
          reported_by?: string | null
          reservation_id: string
          sort?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          document_number?: string | null
          document_type?: string | null
          first_name?: string
          id?: string
          is_citizen?: boolean
          last_name?: string
          nationality?: string | null
          purged_at?: string | null
          reported_at?: string | null
          reported_by?: string | null
          reservation_id?: string
          sort?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_guests_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_guests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          arrival_time: string | null
          completed_at: string | null
          completed_by: string | null
          completed_via: string | null
          created_at: string
          house_rules_accepted_at: string | null
          id: string
          reservation_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          arrival_time?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completed_via?: string | null
          created_at?: string
          house_rules_accepted_at?: string | null
          id?: string
          reservation_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          arrival_time?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completed_via?: string | null
          created_at?: string
          house_rules_accepted_at?: string | null
          id?: string
          reservation_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      discounts: {
        Row: {
          active: boolean
          amount_cents: number | null
          booked_from: string | null
          booked_until: string | null
          code: string | null
          created_at: string
          excluded_from: string | null
          excluded_until: string | null
          id: string
          kind: string
          max_guests: number | null
          min_guests: number | null
          min_nights: number | null
          name: Json
          percent_bp: number | null
          property_id: string | null
          stay_from: string | null
          stay_until: string | null
          tenant_id: string
        }
        Insert: {
          active?: boolean
          amount_cents?: number | null
          booked_from?: string | null
          booked_until?: string | null
          code?: string | null
          created_at?: string
          excluded_from?: string | null
          excluded_until?: string | null
          id?: string
          kind: string
          max_guests?: number | null
          min_guests?: number | null
          min_nights?: number | null
          name: Json
          percent_bp?: number | null
          property_id?: string | null
          stay_from?: string | null
          stay_until?: string | null
          tenant_id: string
        }
        Update: {
          active?: boolean
          amount_cents?: number | null
          booked_from?: string | null
          booked_until?: string | null
          code?: string | null
          created_at?: string
          excluded_from?: string | null
          excluded_until?: string | null
          id?: string
          kind?: string
          max_guests?: number | null
          min_guests?: number | null
          min_nights?: number | null
          name?: Json
          percent_bp?: number | null
          property_id?: string | null
          stay_from?: string | null
          stay_until?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discounts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          id: string
          kind: string
          property_id: string | null
          reservation_id: string | null
          storage_path: string
          tenant_id: string
          title: Json
          visible_when: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          property_id?: string | null
          reservation_id?: string | null
          storage_path: string
          tenant_id: string
          title: Json
          visible_when?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          property_id?: string | null
          reservation_id?: string | null
          storage_path?: string
          tenant_id?: string
          title?: Json
          visible_when?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_outbox: {
        Row: {
          attempts: number
          created_at: string
          id: string
          kind: string
          last_error: string | null
          payload: Json
          provider_id: string | null
          reservation_id: string | null
          send_after: string
          sent_at: string | null
          status: string
          tenant_id: string
          to_email: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          kind: string
          last_error?: string | null
          payload?: Json
          provider_id?: string | null
          reservation_id?: string | null
          send_after?: string
          sent_at?: string | null
          status?: string
          tenant_id: string
          to_email?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          kind?: string
          last_error?: string | null
          payload?: Json
          provider_id?: string | null
          reservation_id?: string | null
          send_after?: string
          sent_at?: string | null
          status?: string
          tenant_id?: string
          to_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_outbox_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_outbox_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fees: {
        Row: {
          active: boolean
          amount_cents: number
          id: string
          key: string | null
          kind: string
          name: Json
          price_model: string
          property_id: string
          refundable_deposit: boolean
          sort: number
          tenant_id: string
          vat_bp: number
        }
        Insert: {
          active?: boolean
          amount_cents: number
          id?: string
          key?: string | null
          kind?: string
          name: Json
          price_model: string
          property_id: string
          refundable_deposit?: boolean
          sort?: number
          tenant_id: string
          vat_bp?: number
        }
        Update: {
          active?: boolean
          amount_cents?: number
          id?: string
          key?: string | null
          kind?: string
          name?: Json
          price_model?: string
          property_id?: string
          refundable_deposit?: boolean
          sort?: number
          tenant_id?: string
          vat_bp?: number
        }
        Relationships: [
          {
            foreignKeyName: "fees_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_auth_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          kind: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          kind: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          kind?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_auth_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_consent_events: {
        Row: {
          created_at: string
          granted: boolean
          guest_id: string
          id: string
          kind: string
          source: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          granted: boolean
          guest_id: string
          id?: string
          kind?: string
          source?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          guest_id?: string
          id?: string
          kind?: string
          source?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_consent_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_consent_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          country: string | null
          created_at: string
          deletion_requested_at: string | null
          email: string
          id: string
          marketing_consent: boolean
          marketing_consent_at: string | null
          name: string | null
          phone: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          email: string
          id?: string
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          name?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          email?: string
          id?: string
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          name?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ical_channels: {
        Row: {
          active: boolean
          created_at: string
          export_excluded: boolean
          id: string
          import_url: string
          last_error: string | null
          last_status: string | null
          last_sync_at: string | null
          name: string
          source: string
          tenant_id: string
          unit_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          export_excluded?: boolean
          id?: string
          import_url: string
          last_error?: string | null
          last_status?: string | null
          last_sync_at?: string | null
          name: string
          source?: string
          tenant_id: string
          unit_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          export_excluded?: boolean
          id?: string
          import_url?: string
          last_error?: string | null
          last_status?: string | null
          last_sync_at?: string | null
          name?: string
          source?: string
          tenant_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ical_channels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ical_channels_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_overrides: {
        Row: {
          body: string | null
          reservation_id: string
          rule_id: string
          skip: boolean
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string | null
          reservation_id: string
          rule_id: string
          skip?: boolean
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string | null
          reservation_id?: string
          rule_id?: string
          skip?: boolean
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_overrides_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_overrides_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "message_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_overrides_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_rules: {
        Row: {
          anchor: string
          body: Json
          created_at: string
          enabled: boolean
          id: string
          key: string | null
          name: Json
          offset_days: number
          send_time: string | null
          sort: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          anchor: string
          body?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          key?: string | null
          name?: Json
          offset_days?: number
          send_time?: string | null
          sort?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          anchor?: string
          body?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          key?: string | null
          name?: Json
          offset_days?: number
          send_time?: string | null
          sort?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          guest_read_at: string | null
          reservation_id: string
          team_read_at: string | null
          tenant_id: string
        }
        Insert: {
          guest_read_at?: string | null
          reservation_id: string
          team_read_at?: string | null
          tenant_id: string
        }
        Update: {
          guest_read_at?: string | null
          reservation_id?: string
          team_read_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          email_via: string | null
          id: string
          reservation_id: string
          rule_id: string | null
          sender: string
          tenant_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          email_via?: string | null
          id?: string
          reservation_id: string
          rule_id?: string | null
          sender: string
          tenant_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          email_via?: string | null
          id?: string
          reservation_id?: string
          rule_id?: string | null
          sender?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "message_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string
          key: string
        }
        Insert: {
          created_at?: string
          key: string
        }
        Update: {
          created_at?: string
          key?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          audience: string
          created_at: string
          data: Json
          dedupe_key: string
          id: string
          kind: string
          target: string | null
          tenant_id: string | null
        }
        Insert: {
          audience: string
          created_at?: string
          data?: Json
          dedupe_key: string
          id?: string
          kind: string
          target?: string | null
          tenant_id?: string | null
        }
        Update: {
          audience?: string
          created_at?: string
          data?: Json
          dedupe_key?: string
          id?: string
          kind?: string
          target?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      occupancy: {
        Row: {
          conflict: boolean
          conflict_detected_at: string | null
          conflict_resolved_at: string | null
          conflict_resolved_by: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          ical_channel_id: string | null
          ical_details: Json | null
          ical_uid: string | null
          id: string
          is_blocking: boolean
          kind: string
          label: string | null
          nights: unknown
          reservation_id: string | null
          tenant_id: string
          unit_id: string
        }
        Insert: {
          conflict?: boolean
          conflict_detected_at?: string | null
          conflict_resolved_at?: string | null
          conflict_resolved_by?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          ical_channel_id?: string | null
          ical_details?: Json | null
          ical_uid?: string | null
          id?: string
          is_blocking?: boolean
          kind: string
          label?: string | null
          nights: unknown
          reservation_id?: string | null
          tenant_id: string
          unit_id: string
        }
        Update: {
          conflict?: boolean
          conflict_detected_at?: string | null
          conflict_resolved_at?: string | null
          conflict_resolved_by?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          ical_channel_id?: string | null
          ical_details?: Json | null
          ical_uid?: string | null
          id?: string
          is_blocking?: boolean
          kind?: string
          label?: string | null
          nights?: unknown
          reservation_id?: string | null
          tenant_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "occupancy_conflict_resolved_by_fkey"
            columns: ["conflict_resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occupancy_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occupancy_ical_channel_id_fkey"
            columns: ["ical_channel_id"]
            isOneToOne: false
            referencedRelation: "ical_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occupancy_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occupancy_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occupancy_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          provider: string
          purpose: string
          received_at: string | null
          received_by: string | null
          reservation_id: string
          status: string
          tenant_id: string
          variable_symbol: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency: string
          id?: string
          provider?: string
          purpose?: string
          received_at?: string | null
          received_by?: string | null
          reservation_id: string
          status?: string
          tenant_id: string
          variable_symbol?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          provider?: string
          purpose?: string
          received_at?: string | null
          received_by?: string | null
          reservation_id?: string
          status?: string
          tenant_id?: string
          variable_symbol?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          alt: Json
          category: string | null
          created_at: string
          height: number | null
          id: string
          property_id: string
          sort: number
          source: string | null
          storage_path: string
          tenant_id: string
          unit_id: string | null
          width: number | null
        }
        Insert: {
          alt?: Json
          category?: string | null
          created_at?: string
          height?: number | null
          id?: string
          property_id: string
          sort?: number
          source?: string | null
          storage_path: string
          tenant_id: string
          unit_id?: string | null
          width?: number | null
        }
        Update: {
          alt?: Json
          category?: string | null
          created_at?: string
          height?: number | null
          id?: string
          property_id?: string
          sort?: number
          source?: string | null
          storage_path?: string
          tenant_id?: string
          unit_id?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_backups: {
        Row: {
          created_by: string | null
          environment: string
          files: number | null
          finished_at: string
          id: string
          kind: string
          note: string | null
          ok: boolean
          run_url: string | null
          size_bytes: number | null
          started_at: string | null
          tables_compared: number | null
        }
        Insert: {
          created_by?: string | null
          environment?: string
          files?: number | null
          finished_at?: string
          id?: string
          kind: string
          note?: string | null
          ok: boolean
          run_url?: string | null
          size_bytes?: number | null
          started_at?: string | null
          tables_compared?: number | null
        }
        Update: {
          created_by?: string | null
          environment?: string
          files?: number | null
          finished_at?: string
          id?: string
          kind?: string
          note?: string | null
          ok?: boolean
          run_url?: string | null
          size_bytes?: number | null
          started_at?: string | null
          tables_compared?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          locale: string
          tours_seen: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          locale?: string
          tours_seen?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          locale?: string
          tours_seen?: Json
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          accommodation_vat_bp: number
          bathrooms: number | null
          bedrooms: number | null
          booking_mode: string
          check_in_from: string
          check_out_until: string
          checkin_opens_days_before: number
          checkin_reminder_days: number[]
          checkin_required_for_instructions: boolean
          city: string | null
          cleaning_gap_days: number
          contact_email: string | null
          contact_phone: string | null
          country: string
          created_at: string
          description: Json
          house_rules: Json
          id: string
          included: Json
          latitude: number | null
          location_mode: string
          longitude: number | null
          max_guests: number
          name: string
          pets_allowed: boolean
          postal_code: string | null
          pricing_model: string
          slug: string
          sort: number
          status: string
          street: string | null
          summary: Json
          tagline: Json
          tenant_id: string
          testimonials: Json
          tourist_tax_cents: number
          tourist_tax_included: boolean
          updated_at: string
        }
        Insert: {
          accommodation_vat_bp?: number
          bathrooms?: number | null
          bedrooms?: number | null
          booking_mode?: string
          check_in_from?: string
          check_out_until?: string
          checkin_opens_days_before?: number
          checkin_reminder_days?: number[]
          checkin_required_for_instructions?: boolean
          city?: string | null
          cleaning_gap_days?: number
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          description?: Json
          house_rules?: Json
          id?: string
          included?: Json
          latitude?: number | null
          location_mode?: string
          longitude?: number | null
          max_guests?: number
          name: string
          pets_allowed?: boolean
          postal_code?: string | null
          pricing_model?: string
          slug: string
          sort?: number
          status?: string
          street?: string | null
          summary?: Json
          tagline?: Json
          tenant_id: string
          testimonials?: Json
          tourist_tax_cents?: number
          tourist_tax_included?: boolean
          updated_at?: string
        }
        Update: {
          accommodation_vat_bp?: number
          bathrooms?: number | null
          bedrooms?: number | null
          booking_mode?: string
          check_in_from?: string
          check_out_until?: string
          checkin_opens_days_before?: number
          checkin_reminder_days?: number[]
          checkin_required_for_instructions?: boolean
          city?: string | null
          cleaning_gap_days?: number
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          description?: Json
          house_rules?: Json
          id?: string
          included?: Json
          latitude?: number | null
          location_mode?: string
          longitude?: number | null
          max_guests?: number
          name?: string
          pets_allowed?: boolean
          postal_code?: string | null
          pricing_model?: string
          slug?: string
          sort?: number
          status?: string
          street?: string | null
          summary?: Json
          tagline?: Json
          tenant_id?: string
          testimonials?: Json
          tourist_tax_cents?: number
          tourist_tax_included?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      property_places: {
        Row: {
          created_at: string
          distance: string | null
          how: Json
          id: string
          name: Json
          property_id: string
          sort: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          distance?: string | null
          how?: Json
          id?: string
          name: Json
          property_id: string
          sort?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          distance?: string | null
          how?: Json
          id?: string
          name?: Json
          property_id?: string
          sort?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_places_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_places_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      property_private: {
        Row: {
          arrival_instructions: Json
          door_code: string | null
          property_id: string
          tenant_id: string
          updated_at: string
          wifi_name: string | null
          wifi_password: string | null
        }
        Insert: {
          arrival_instructions?: Json
          door_code?: string | null
          property_id: string
          tenant_id: string
          updated_at?: string
          wifi_name?: string | null
          wifi_password?: string | null
        }
        Update: {
          arrival_instructions?: Json
          door_code?: string | null
          property_id?: string
          tenant_id?: string
          updated_at?: string
          wifi_name?: string | null
          wifi_password?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_private_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_private_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      property_sections: {
        Row: {
          content: Json
          created_at: string
          enabled: boolean
          id: string
          property_id: string
          sort: number
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          property_id: string
          sort?: number
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          property_id?: string
          sort?: number
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_sections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_sections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      property_terms: {
        Row: {
          highlight_note: Json
          highlight_sort: number
          highlighted: boolean
          property_id: string
          tenant_id: string
          term_id: string
        }
        Insert: {
          highlight_note?: Json
          highlight_sort?: number
          highlighted?: boolean
          property_id: string
          tenant_id: string
          term_id: string
        }
        Update: {
          highlight_note?: Json
          highlight_sort?: number
          highlighted?: boolean
          property_id?: string
          tenant_id?: string
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_terms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_terms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_terms_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      push_queue: {
        Row: {
          claimed_at: string | null
          created_at: string
          notification_id: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          notification_id: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          notification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_queue_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: true
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device: string
          endpoint: string
          failures: number
          id: string
          kinds: string[]
          last_success_at: string | null
          p256dh: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device?: string
          endpoint: string
          failures?: number
          id?: string
          kinds?: string[]
          last_success_at?: string | null
          p256dh: string
          tenant_id?: string | null
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          device?: string
          endpoint?: string
          failures?: number
          id?: string
          kinds?: string[]
          last_success_at?: string | null
          p256dh?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          sort: number
          tenant_id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sort?: number
          tenant_id: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sort?: number
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_replies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_band_prices: {
        Row: {
          age_band_id: string
          amount_cents: number
          rate_id: string
          tenant_id: string
        }
        Insert: {
          age_band_id: string
          amount_cents: number
          rate_id: string
          tenant_id: string
        }
        Update: {
          age_band_id?: string
          amount_cents?: number
          rate_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_band_prices_age_band_id_fkey"
            columns: ["age_band_id"]
            isOneToOne: false
            referencedRelation: "age_bands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_band_prices_rate_id_fkey"
            columns: ["rate_id"]
            isOneToOne: false
            referencedRelation: "rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_band_prices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rates: {
        Row: {
          amount_cents: number
          id: string
          season_id: string
          tenant_id: string
          unit_id: string
        }
        Insert: {
          amount_cents: number
          id?: string
          season_id: string
          tenant_id: string
          unit_id: string
        }
        Update: {
          amount_cents?: number
          id?: string
          season_id?: string
          tenant_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rates_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rates_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      record_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          files_purged_at: string | null
          id: number
          new_row: Json | null
          old_row: Json | null
          op: string
          pk: Json
          record_id: string
          source: string
          table_name: string
          tenant_id: string
          tx_id: number
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          files_purged_at?: string | null
          id?: never
          new_row?: Json | null
          old_row?: Json | null
          op: string
          pk: Json
          record_id: string
          source: string
          table_name: string
          tenant_id: string
          tx_id?: number
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          files_purged_at?: string | null
          id?: never
          new_row?: Json | null
          old_row?: Json | null
          op?: string
          pk?: Json
          record_id?: string
          source?: string
          table_name?: string
          tenant_id?: string
          tx_id?: number
        }
        Relationships: []
      }
      request_attempts: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_hash: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_hash: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_hash?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_consents: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          kind: string
          reservation_id: string
          tenant_id: string
          text_snapshot: string
          version: string | null
        }
        Insert: {
          created_at?: string
          granted: boolean
          id?: string
          kind: string
          reservation_id: string
          tenant_id: string
          text_snapshot: string
          version?: string | null
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          kind?: string
          reservation_id?: string
          tenant_id?: string
          text_snapshot?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_consents_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_consents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_counters: {
        Row: {
          last_value: number
          tenant_id: string
          year: number
        }
        Insert: {
          last_value?: number
          tenant_id: string
          year: number
        }
        Update: {
          last_value?: number
          tenant_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "reservation_counters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_items: {
        Row: {
          check_in: string
          check_out: string
          id: string
          reservation_id: string
          tenant_id: string
          unit_id: string
        }
        Insert: {
          check_in: string
          check_out: string
          id?: string
          reservation_id: string
          tenant_id: string
          unit_id: string
        }
        Update: {
          check_in?: string
          check_out?: string
          id?: string
          reservation_id?: string
          tenant_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_items_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_lines: {
        Row: {
          amount_cents: number
          id: string
          kind: string
          label: string
          meta: Json
          quantity: number
          ref_id: string | null
          reservation_id: string
          sort: number
          tenant_id: string
          unit_amount_cents: number
          vat_bp: number
        }
        Insert: {
          amount_cents: number
          id?: string
          kind: string
          label: string
          meta?: Json
          quantity?: number
          ref_id?: string | null
          reservation_id: string
          sort: number
          tenant_id: string
          unit_amount_cents: number
          vat_bp?: number
        }
        Update: {
          amount_cents?: number
          id?: string
          kind?: string
          label?: string
          meta?: Json
          quantity?: number
          ref_id?: string | null
          reservation_id?: string
          sort?: number
          tenant_id?: string
          unit_amount_cents?: number
          vat_bp?: number
        }
        Relationships: [
          {
            foreignKeyName: "reservation_lines_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          reservation_id: string
          tenant_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          reservation_id: string
          tenant_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          reservation_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_notes_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_orders: {
        Row: {
          amount_cents: number
          cancelled_at: string | null
          created_at: string
          currency: string
          cutoff_at: string
          decided_at: string | null
          decided_by: string | null
          decline_reason: string | null
          id: string
          items: number
          label: string
          note: string | null
          ordered_by: string | null
          ordered_via: string
          paid_at: string | null
          payment_id: string | null
          payment_method: string
          price_model: string
          quantity: number
          reservation_id: string
          service_date: string | null
          service_id: string | null
          status: string
          tenant_id: string
          unit_amount_cents: number
          updated_at: string
          vat_bp: number
        }
        Insert: {
          amount_cents: number
          cancelled_at?: string | null
          created_at?: string
          currency: string
          cutoff_at: string
          decided_at?: string | null
          decided_by?: string | null
          decline_reason?: string | null
          id?: string
          items?: number
          label: string
          note?: string | null
          ordered_by?: string | null
          ordered_via: string
          paid_at?: string | null
          payment_id?: string | null
          payment_method: string
          price_model: string
          quantity: number
          reservation_id: string
          service_date?: string | null
          service_id?: string | null
          status?: string
          tenant_id: string
          unit_amount_cents: number
          updated_at?: string
          vat_bp?: number
        }
        Update: {
          amount_cents?: number
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          cutoff_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decline_reason?: string | null
          id?: string
          items?: number
          label?: string
          note?: string | null
          ordered_by?: string | null
          ordered_via?: string
          paid_at?: string | null
          payment_id?: string | null
          payment_method?: string
          price_model?: string
          quantity?: number
          reservation_id?: string
          service_date?: string | null
          service_id?: string | null
          status?: string
          tenant_id?: string
          unit_amount_cents?: number
          updated_at?: string
          vat_bp?: number
        }
        Relationships: [
          {
            foreignKeyName: "reservation_orders_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_orders_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_status: string | null
          id: number
          reason: string | null
          reservation_id: string
          tenant_id: string
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: never
          reason?: string | null
          reservation_id: string
          tenant_id: string
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: never
          reason?: string | null
          reservation_id?: string
          tenant_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_status_history_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          access_token_enc: string | null
          access_token_hash: string
          adults: number
          cancellation_request_note: string | null
          cancellation_requested_at: string | null
          cancelled_reason: string | null
          children: number
          created_at: string
          created_by: string | null
          currency: string
          guest_country: string | null
          guest_email: string
          guest_id: string | null
          guest_name: string
          guest_note: string | null
          guest_phone: string | null
          guests_by_band: Json | null
          id: string
          infants: number
          locale: string
          marketing_consent: boolean
          number: string
          payment_due_at: string | null
          pets: number
          promo_code: string | null
          property_id: string
          source: string
          status: string
          tenant_id: string
          total_cents: number
          updated_at: string
        }
        Insert: {
          access_token_enc?: string | null
          access_token_hash: string
          adults?: number
          cancellation_request_note?: string | null
          cancellation_requested_at?: string | null
          cancelled_reason?: string | null
          children?: number
          created_at?: string
          created_by?: string | null
          currency: string
          guest_country?: string | null
          guest_email: string
          guest_id?: string | null
          guest_name: string
          guest_note?: string | null
          guest_phone?: string | null
          guests_by_band?: Json | null
          id?: string
          infants?: number
          locale?: string
          marketing_consent?: boolean
          number: string
          payment_due_at?: string | null
          pets?: number
          promo_code?: string | null
          property_id: string
          source?: string
          status?: string
          tenant_id: string
          total_cents: number
          updated_at?: string
        }
        Update: {
          access_token_enc?: string | null
          access_token_hash?: string
          adults?: number
          cancellation_request_note?: string | null
          cancellation_requested_at?: string | null
          cancelled_reason?: string | null
          children?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          guest_country?: string | null
          guest_email?: string
          guest_id?: string | null
          guest_name?: string
          guest_note?: string | null
          guest_phone?: string | null
          guests_by_band?: Json | null
          id?: string
          infants?: number
          locale?: string
          marketing_consent?: boolean
          number?: string
          payment_due_at?: string | null
          pets?: number
          promo_code?: string | null
          property_id?: string
          source?: string
          status?: string
          tenant_id?: string
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string
          display_name: string
          featured: boolean
          guest_id: string | null
          id: string
          locale: string
          owner_reply: string | null
          owner_reply_at: string | null
          property_id: string
          published_at: string | null
          rating: number
          rating_cleanliness: number | null
          rating_communication: number | null
          rating_location: number | null
          rating_value: number | null
          reject_reason: string | null
          rejected_at: string | null
          reservation_id: string
          status: string
          stay_month: string
          submitted_at: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          body?: string
          display_name: string
          featured?: boolean
          guest_id?: string | null
          id?: string
          locale?: string
          owner_reply?: string | null
          owner_reply_at?: string | null
          property_id: string
          published_at?: string | null
          rating: number
          rating_cleanliness?: number | null
          rating_communication?: number | null
          rating_location?: number | null
          rating_value?: number | null
          reject_reason?: string | null
          rejected_at?: string | null
          reservation_id: string
          status?: string
          stay_month: string
          submitted_at?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          display_name?: string
          featured?: boolean
          guest_id?: string | null
          id?: string
          locale?: string
          owner_reply?: string | null
          owner_reply_at?: string | null
          property_id?: string
          published_at?: string | null
          rating?: number
          rating_cleanliness?: number | null
          rating_communication?: number | null
          rating_location?: number | null
          rating_value?: number | null
          reject_reason?: string | null
          rejected_at?: string | null
          reservation_id?: string
          status?: string
          stay_month?: string
          submitted_at?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      season_ranges: {
        Row: {
          end_date: string
          id: string
          repeat_yearly: boolean
          season_id: string
          start_date: string
          tenant_id: string
        }
        Insert: {
          end_date: string
          id?: string
          repeat_yearly?: boolean
          season_id: string
          start_date: string
          tenant_id: string
        }
        Update: {
          end_date?: string
          id?: string
          repeat_yearly?: boolean
          season_id?: string
          start_date?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_ranges_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_ranges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          arrival_days: number[] | null
          color: string | null
          created_at: string
          id: string
          is_default: boolean
          max_nights: number | null
          min_nights: number
          name: Json
          priority: number
          property_id: string
          sort: number
          tenant_id: string
        }
        Insert: {
          arrival_days?: number[] | null
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          max_nights?: number | null
          min_nights?: number
          name: Json
          priority?: number
          property_id: string
          sort?: number
          tenant_id: string
        }
        Update: {
          arrival_days?: number[] | null
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          max_nights?: number | null
          min_nights?: number
          name?: Json
          priority?: number
          property_id?: string
          sort?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      section_templates: {
        Row: {
          key: string
          name: Json
          property_types: string[]
          sort: number
          types: string[]
        }
        Insert: {
          key: string
          name: Json
          property_types?: string[]
          sort?: number
          types: string[]
        }
        Update: {
          key?: string
          name?: Json
          property_types?: string[]
          sort?: number
          types?: string[]
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          amount_cents: number
          description: Json
          id: string
          image_path: string | null
          key: string | null
          max_quantity: number | null
          name: Json
          price_model: string
          property_id: string | null
          sort: number
          tenant_id: string
          upsell_cutoff_hours: number
          upsell_enabled: boolean
          upsell_requires_confirmation: boolean
          upsell_stay_account: boolean
          vat_bp: number
        }
        Insert: {
          active?: boolean
          amount_cents: number
          description?: Json
          id?: string
          image_path?: string | null
          key?: string | null
          max_quantity?: number | null
          name: Json
          price_model: string
          property_id?: string | null
          sort?: number
          tenant_id: string
          upsell_cutoff_hours?: number
          upsell_enabled?: boolean
          upsell_requires_confirmation?: boolean
          upsell_stay_account?: boolean
          vat_bp?: number
        }
        Update: {
          active?: boolean
          amount_cents?: number
          description?: Json
          id?: string
          image_path?: string | null
          key?: string | null
          max_quantity?: number | null
          name?: Json
          price_model?: string
          property_id?: string | null
          sort?: number
          tenant_id?: string
          upsell_cutoff_hours?: number
          upsell_enabled?: boolean
          upsell_requires_confirmation?: boolean
          upsell_stay_account?: boolean
          vat_bp?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_domains: {
        Row: {
          created_at: string
          hostname: string
          id: string
          is_primary: boolean
          tenant_id: string
        }
        Insert: {
          created_at?: string
          hostname: string
          id?: string
          is_primary?: boolean
          tenant_id: string
        }
        Update: {
          created_at?: string
          hostname?: string
          id?: string
          is_primary?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_modules: {
        Row: {
          module_key: string
          status: string
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          module_key: string
          status?: string
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          module_key?: string
          status?: string
          tenant_id?: string
          trial_ends_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_modules_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "tenant_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_modules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          account_holder: string | null
          accountant_email: string | null
          arrival_email_days_before: number
          bic: string | null
          cancellation_bands: Json
          cancellation_policy: Json
          checkin_retention_days: number
          city_tax_cents: number
          city_tax_exempt_under: number
          city_tax_municipality: string | null
          contact_name: string | null
          contact_phone: string | null
          google_review_url: string | null
          hold_minutes: number
          iban: string | null
          message_signature: string | null
          message_topics: Json | null
          monthly_report_email: boolean
          owner_notification_email: string | null
          payment_due_hours: number
          portal_commission_bp: number
          privacy_url: string | null
          report_minutes: Json
          reviews_url: string | null
          stay_account_limit_cents: number
          tenant_id: string
          terms_url: string | null
          updated_at: string
          upsell_offer_days: number[]
          vat_payer: boolean
          website_url: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          account_holder?: string | null
          accountant_email?: string | null
          arrival_email_days_before?: number
          bic?: string | null
          cancellation_bands?: Json
          cancellation_policy?: Json
          checkin_retention_days?: number
          city_tax_cents?: number
          city_tax_exempt_under?: number
          city_tax_municipality?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          google_review_url?: string | null
          hold_minutes?: number
          iban?: string | null
          message_signature?: string | null
          message_topics?: Json | null
          monthly_report_email?: boolean
          owner_notification_email?: string | null
          payment_due_hours?: number
          portal_commission_bp?: number
          privacy_url?: string | null
          report_minutes?: Json
          reviews_url?: string | null
          stay_account_limit_cents?: number
          tenant_id: string
          terms_url?: string | null
          updated_at?: string
          upsell_offer_days?: number[]
          vat_payer?: boolean
          website_url?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          account_holder?: string | null
          accountant_email?: string | null
          arrival_email_days_before?: number
          bic?: string | null
          cancellation_bands?: Json
          cancellation_policy?: Json
          checkin_retention_days?: number
          city_tax_cents?: number
          city_tax_exempt_under?: number
          city_tax_municipality?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          google_review_url?: string | null
          hold_minutes?: number
          iban?: string | null
          message_signature?: string | null
          message_topics?: Json | null
          monthly_report_email?: boolean
          owner_notification_email?: string | null
          payment_due_hours?: number
          portal_commission_bp?: number
          privacy_url?: string | null
          report_minutes?: Json
          reviews_url?: string | null
          stay_account_limit_cents?: number
          tenant_id?: string
          terms_url?: string | null
          updated_at?: string
          upsell_offer_days?: number[]
          vat_payer?: boolean
          website_url?: string | null
          whatsapp_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_themes: {
        Row: {
          background_color: string
          body_font: string
          color_mode: string
          heading_font: string
          logo_path: string | null
          primary_color: string
          radius: number
          secondary_color: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          background_color?: string
          body_font?: string
          color_mode?: string
          heading_font?: string
          logo_path?: string | null
          primary_color?: string
          radius?: number
          secondary_color?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          background_color?: string
          body_font?: string
          color_mode?: string
          heading_font?: string
          logo_path?: string | null
          primary_color?: string
          radius?: number
          secondary_color?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_themes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          country: string
          created_at: string
          currency: string
          default_locale: string
          id: string
          locales: string[]
          name: string
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          country?: string
          created_at?: string
          currency?: string
          default_locale?: string
          id?: string
          locales?: string[]
          name: string
          slug: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          currency?: string
          default_locale?: string
          id?: string
          locales?: string[]
          name?: string
          slug?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      terms: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          key: string
          kind: string
          name: Json
          sort: number
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          key: string
          kind: string
          name: Json
          sort?: number
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          key?: string
          kind?: string
          name?: Json
          sort?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "terms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          author_name: string
          body: Json
          created_at: string
          featured: boolean
          id: string
          property_id: string | null
          published: boolean
          sort: number
          source: string
          source_url: string | null
          stay_month: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          author_name: string
          body: Json
          created_at?: string
          featured?: boolean
          id?: string
          property_id?: string | null
          published?: boolean
          sort?: number
          source?: string
          source_url?: string | null
          stay_month?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          body?: Json
          created_at?: string
          featured?: boolean
          id?: string
          property_id?: string | null
          published?: boolean
          sort?: number
          source?: string
          source_url?: string | null
          stay_month?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_components: {
        Row: {
          child_unit_id: string
          parent_unit_id: string
          tenant_id: string
        }
        Insert: {
          child_unit_id: string
          parent_unit_id: string
          tenant_id: string
        }
        Update: {
          child_unit_id?: string
          parent_unit_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_components_child_unit_id_fkey"
            columns: ["child_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_components_parent_unit_id_fkey"
            columns: ["parent_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_components_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          active: boolean
          bedrooms: number | null
          created_at: string
          description: Json
          ical_export_token: string
          id: string
          is_default: boolean
          max_guests: number
          name: string
          property_id: string
          sort: number
          tenant_id: string
        }
        Insert: {
          active?: boolean
          bedrooms?: number | null
          created_at?: string
          description?: Json
          ical_export_token?: string
          id?: string
          is_default?: boolean
          max_guests?: number
          name: string
          property_id: string
          sort?: number
          tenant_id: string
        }
        Update: {
          active?: boolean
          bedrooms?: number | null
          created_at?: string
          description?: Json
          ical_export_token?: string
          id?: string
          is_default?: boolean
          max_guests?: number
          name?: string
          property_id?: string
          sort?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      access_token_key: { Args: never; Returns: string }
      apply_section_template: {
        Args: {
          p_property_id: string
          p_replace?: boolean
          p_template?: string
        }
        Returns: string
      }
      arrival_instructions_visible: {
        Args: { p_reservation_id: string }
        Returns: boolean
      }
      arrival_order: {
        Args: { r: Database["public"]["Tables"]["reservations"]["Row"] }
        Returns: number
      }
      arrivals_overview: {
        Args: { p_days?: number; p_tenant_id: string }
        Returns: {
          check_in: string
          check_out: string
          checkin_status: string
          foreigners: number
          guest_name: string
          number: string
          people: number
          persons: number
          property_name: string
          report_due: string
          reservation_id: string
          unreported: number
        }[]
      }
      audit_sign_in: { Args: { p_method: string }; Returns: undefined }
      backups_check: { Args: never; Returns: undefined }
      cancel_order: {
        Args: { p_order_id: string; p_token?: string }
        Returns: undefined
      }
      cancel_reservation: {
        Args: { p_reason?: string; p_reservation_id: string }
        Returns: undefined
      }
      change_reservation_status: {
        Args: {
          p_actor: string
          p_reason?: string
          p_reservation_id: string
          p_to: string
        }
        Returns: undefined
      }
      checkin_missing: { Args: { p_reservation_id: string }; Returns: Json }
      checkin_people: {
        Args: { p_reservation_id: string }
        Returns: {
          address: string
          document_masked: string
          document_type: string
          first_name: string
          has_birth_date: boolean
          id: string
          is_citizen: boolean
          last_name: string
          nationality: string
          purged: boolean
          report_due: string
          reported_at: string
          sort: number
        }[]
      }
      checkin_people_by_id: {
        Args: { p_guest_id: string }
        Returns: {
          check_in: string
          check_out: string
          first_name: string
          last_name: string
          property_address: string
          property_name: string
          reservation_number: string
          tenant_name: string
        }[]
      }
      checkin_rules: { Args: { p_country: string }; Returns: Json }
      checkin_tick: { Args: never; Returns: Json }
      checkin_window: { Args: { p_reservation_id: string }; Returns: string }
      city_tax_month: {
        Args: { p_month: string; p_tenant_id: string }
        Returns: {
          check_in: string
          check_out: string
          exempt: number
          guest_name: string
          nights: number
          number: string
          paying: number
          reservation_id: string
          source: string
        }[]
      }
      claim_email_jobs: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          created_at: string
          id: string
          kind: string
          last_error: string | null
          payload: Json
          provider_id: string | null
          reservation_id: string | null
          send_after: string
          sent_at: string | null
          status: string
          tenant_id: string
          to_email: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "email_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_guest_account: { Args: { p_tenant_id: string }; Returns: string }
      claim_push_jobs: { Args: { p_limit?: number }; Returns: string[] }
      complete_checkin: {
        Args: { p_reservation_id: string; p_token?: string }
        Returns: undefined
      }
      confirm_payment: {
        Args: { p_reservation_id: string }
        Returns: undefined
      }
      create_hold: {
        Args: { p_check_in: string; p_check_out: string; p_unit_id: string }
        Returns: string
      }
      create_reservation: {
        Args: { p: Json }
        Returns: {
          access_token: string
          id: string
          number: string
        }[]
      }
      current_guest_id: { Args: { p_tenant_id: string }; Returns: string }
      decide_order: {
        Args: { p_confirm: boolean; p_order_id: string; p_reason?: string }
        Returns: undefined
      }
      dismiss_cancellation_request: {
        Args: { p_reservation_id: string }
        Returns: undefined
      }
      enqueue_scheduled_emails: { Args: never; Returns: number }
      expire_pending_reservations: { Args: never; Returns: string[] }
      extend_payment_due: {
        Args: { p_hours?: number; p_reservation_id: string }
        Returns: string
      }
      finish_email_job: {
        Args: {
          p_error: string
          p_id: string
          p_ok: boolean
          p_provider_id: string
          p_to: string
        }
        Returns: undefined
      }
      forget_guest_history: {
        Args: { p_email: string; p_tenant_id: string }
        Returns: number
      }
      free_units: {
        Args: { p_check_in: string; p_check_out: string; p_tenant_id: string }
        Returns: {
          property_id: string
          unit_id: string
        }[]
      }
      guest_arrival_instructions: {
        Args: { p_reservation_id: string }
        Returns: Json
      }
      guest_checkin_view: {
        Args: { p_reservation_id: string; p_token?: string }
        Returns: Json
      }
      guest_messages: {
        Args: { p_reservation_id: string; p_token?: string }
        Returns: Json
      }
      guest_request_cancellation: {
        Args: { p_note?: string; p_reservation_id: string }
        Returns: boolean
      }
      guest_set_marketing: {
        Args: { p_granted: boolean; p_tenant_id: string }
        Returns: boolean
      }
      guest_stay_state: {
        Args: { p_reservation_id: string; p_token?: string }
        Returns: Json
      }
      history_columns: { Args: { p_table: string }; Returns: string }
      history_current: { Args: { p_pk: Json; p_table: string }; Returns: Json }
      history_noise: { Args: { p_row: Json }; Returns: Json }
      history_pk_where: { Args: { p_pk: Json }; Returns: string }
      history_restore_deleted: {
        Args: { p_entry: Database["public"]["Tables"]["record_history"]["Row"] }
        Returns: string
      }
      hit_request_limit: {
        Args: {
          p_action: string
          p_ip_hash: string
          p_max: number
          p_tenant_id: string
          p_window_seconds: number
        }
        Returns: boolean
      }
      ical_apply: {
        Args: { p_channel_id: string; p_events: Json }
        Returns: Json
      }
      ical_channel_status: { Args: { p_channel_id: string }; Returns: string }
      ical_export: {
        Args: { p_exclude_channel?: string; p_token: string }
        Returns: {
          kind: string
          nights: unknown
          uid: string
        }[]
      }
      ical_mark_error: {
        Args: { p_channel_id: string; p_error: string }
        Returns: undefined
      }
      is_active_tenant: { Args: { p_tenant_id: string }; Returns: boolean }
      is_module_enabled: {
        Args: { p_module_key: string; p_tenant_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      is_public_property: { Args: { p_property_id: string }; Returns: boolean }
      is_tenant_member: {
        Args: { p_roles?: string[]; p_tenant_id: string }
        Returns: boolean
      }
      is_tenant_owner: { Args: { p_tenant_id: string }; Returns: boolean }
      is_tenant_staff: { Args: { p_tenant_id: string }; Returns: boolean }
      mark_foreigner_reported: {
        Args: { p_guest_id: string; p_reported?: boolean }
        Returns: undefined
      }
      mark_messages_read: {
        Args: { p_reservation_id: string; p_token?: string }
        Returns: undefined
      }
      mark_tour_seen: {
        Args: { p_tour: string; p_version: string }
        Returns: undefined
      }
      message_inbox: {
        Args: { p_filter?: string; p_search?: string; p_tenant_id: string }
        Returns: {
          check_in: string
          check_out: string
          guest_name: string
          last_at: string
          last_body: string
          last_sender: string
          number: string
          reservation_id: string
          status: string
          unread: boolean
          waiting: boolean
        }[]
      }
      message_rule_at: {
        Args: {
          p_reservation_id: string
          p_rule: Database["public"]["Tables"]["message_rules"]["Row"]
        }
        Returns: string
      }
      message_rule_text: {
        Args: {
          p_reservation_id: string
          p_rule: Database["public"]["Tables"]["message_rules"]["Row"]
        }
        Returns: string
      }
      messages_for: {
        Args: { p_reservation_id: string; p_token?: string }
        Returns: {
          body: string
          created_at: string
          id: string
          rule_id: string
          sender: string
        }[]
      }
      messages_review_rule: { Args: { p_tenant_id: string }; Returns: string }
      messages_tick: { Args: never; Returns: number }
      messages_waiting: { Args: { p_tenant_id: string }; Returns: number }
      monthly_reports_tick: { Args: never; Returns: number }
      my_review_eligibility: {
        Args: { p_reservation_id: string }
        Returns: string
      }
      my_tenant_ids: { Args: never; Returns: string[] }
      next_reservation_number: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      notify: {
        Args: {
          p_audience: string
          p_data: Json
          p_dedupe: string
          p_kind: string
          p_read_by?: string
          p_target: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      notify_scheduled: { Args: never; Returns: undefined }
      owner_reset_sections: {
        Args: { p_property_id: string; p_template: string }
        Returns: string
      }
      owner_restore: { Args: { p_history_id: number }; Returns: string }
      owner_trash: {
        Args: { p_tenant_id: string }
        Returns: {
          deleted_at: string
          deleted_by: string
          id: number
          label: string
          table_name: string
        }[]
      }
      ping_job_worker: { Args: never; Returns: undefined }
      ping_push_worker: { Args: never; Returns: undefined }
      place_order: {
        Args: {
          p_items?: number
          p_note?: string
          p_payment_method?: string
          p_reservation_id: string
          p_service_date?: string
          p_service_id: string
          p_token?: string
        }
        Returns: string
      }
      place_orders: {
        Args: {
          p_dates?: string[]
          p_items?: number
          p_note?: string
          p_payment_method?: string
          p_reservation_id: string
          p_service_id: string
          p_token?: string
        }
        Returns: string[]
      }
      platform_create_tenant: {
        Args: {
          p_country?: string
          p_currency?: string
          p_hostname: string
          p_name: string
          p_slug: string
        }
        Returns: string
      }
      platform_revert_change: {
        Args: { p_force?: boolean; p_history_id: number }
        Returns: Json
      }
      platform_set_module: {
        Args: {
          p_module_key: string
          p_status: string
          p_tenant_id: string
          p_trial_ends_at?: string
        }
        Returns: undefined
      }
      platform_set_tenant_status: {
        Args: { p_status: string; p_tenant_id: string }
        Returns: undefined
      }
      property_public_location: {
        Args: { p_property_id: string }
        Returns: {
          approximate: boolean
          latitude: number
          longitude: number
          postal_code: string
          street: string
        }[]
      }
      public_reviews: {
        Args: { p_limit?: number; p_property_id?: string; p_tenant_id: string }
        Returns: {
          body: string
          display_name: string
          featured: boolean
          id: string
          locale: string
          owner_reply: string
          owner_reply_at: string
          property_id: string
          published_at: string
          rating: number
          rating_cleanliness: number
          rating_communication: number
          rating_location: number
          rating_value: number
          stay_month: string
        }[]
      }
      purge_expired_holds: { Args: { p_unit_id: string }; Returns: undefined }
      release_hold: { Args: { p_hold_id: string }; Returns: undefined }
      request_account_deletion: {
        Args: { p_note?: string; p_tenant_id: string }
        Returns: string
      }
      request_cancellation: {
        Args: { p_note?: string; p_token: string }
        Returns: boolean
      }
      reservation_access: {
        Args: { p_reservation_id: string; p_token?: string }
        Returns: string
      }
      reservation_access_token: {
        Args: { p_reservation_id: string }
        Returns: string
      }
      reservation_by_token: { Args: { p_token: string }; Returns: Json }
      reservation_notice: { Args: { p_reservation_id: string }; Returns: Json }
      reservation_orders_for: {
        Args: { p_reservation_id: string; p_token?: string }
        Returns: {
          amount_cents: number
          cancelled_at: string | null
          created_at: string
          currency: string
          cutoff_at: string
          decided_at: string | null
          decided_by: string | null
          decline_reason: string | null
          id: string
          items: number
          label: string
          note: string | null
          ordered_by: string | null
          ordered_via: string
          paid_at: string | null
          payment_id: string | null
          payment_method: string
          price_model: string
          quantity: number
          reservation_id: string
          service_date: string | null
          service_id: string | null
          status: string
          tenant_id: string
          unit_amount_cents: number
          updated_at: string
          vat_bp: number
        }[]
        SetofOptions: {
          from: "*"
          to: "reservation_orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      resolve_conflict: {
        Args: { p_occupancy_id: string; p_resolved?: boolean }
        Returns: undefined
      }
      restore_discard: { Args: { p_session: string }; Returns: undefined }
      restore_plan: {
        Args: {
          p_apply?: boolean
          p_ids?: string[]
          p_session: string
          p_tenant: string
        }
        Returns: Json
      }
      restore_stage: {
        Args: { p_rows: Json; p_session: string; p_table: string }
        Returns: number
      }
      restore_tables: { Args: never; Returns: string[] }
      restore_typed: { Args: { p_row: Json; p_table: string }; Returns: Json }
      reveal_checkin_guest: {
        Args: { p_guest_id: string; p_purpose?: string }
        Returns: {
          address: string
          birth_date: string
          document_number: string
          document_type: string
          nationality: string
        }[]
      }
      review_display_name: { Args: { p_name: string }; Returns: string }
      review_eligibility: {
        Args: { p_reservation_id: string }
        Returns: string
      }
      review_notice: { Args: { p_review_id: string }; Returns: Json }
      review_summary: {
        Args: { p_property_id?: string; p_tenant_id: string }
        Returns: {
          average: number
          cleanliness: number
          communication: number
          count: number
          distribution: Json
          location: number
          value: number
        }[]
      }
      reviews_tick: { Args: never; Returns: Json }
      save_checkin: {
        Args: { p_data: Json; p_reservation_id: string; p_token?: string }
        Returns: string
      }
      scheduled_messages: {
        Args: { p_reservation_id: string }
        Returns: {
          body: string
          changed: boolean
          rule_id: string
          rule_name: Json
          send_at: string
          skipped: boolean
        }[]
      }
      send_message: {
        Args: { p_body: string; p_reservation_id: string; p_token?: string }
        Returns: string
      }
      set_message_override: {
        Args: {
          p_body?: string
          p_reservation_id: string
          p_rule_id: string
          p_skip: boolean
        }
        Returns: undefined
      }
      set_reservation_progress: {
        Args: { p_reservation_id: string; p_status: string }
        Returns: undefined
      }
      settle_stay_account: {
        Args: { p_provider?: string; p_reservation_id: string }
        Returns: string
      }
      stay_account: {
        Args: { p_reservation_id: string; p_token?: string }
        Returns: {
          currency: string
          limit_cents: number
          open_cents: number
          open_on_account_cents: number
          orders: number
          paid_cents: number
          total_cents: number
        }[]
      }
      stay_nights: {
        Args: { p_check_in: string; p_check_out: string; p_unit_id: string }
        Returns: unknown
      }
      store_access_token: {
        Args: { p_reservation_id: string; p_token: string }
        Returns: undefined
      }
      submit_review: {
        Args: {
          p_body?: string
          p_display_name?: string
          p_locale?: string
          p_rating: number
          p_ratings?: Json
          p_reservation_id: string
        }
        Returns: string
      }
      tenant_by_host: {
        Args: { p_host: string }
        Returns: {
          country: string
          currency: string
          default_locale: string
          id: string
          locales: string[]
          name: string
          slug: string
        }[]
      }
      tenant_monthly_report: {
        Args: { p_month: string; p_tenant_id: string }
        Returns: Json
      }
      tenant_monthly_stats: {
        Args: { p_from: string; p_tenant_id: string; p_to: string }
        Returns: {
          available_nights: number
          future_cents: number
          month: string
          nights_sold: number
          occupied_nights: number
          reservations: number
          revenue_cents: number
        }[]
      }
      tenant_public_contact: {
        Args: { p_tenant_id: string }
        Returns: {
          contact_name: string
          contact_phone: string
          website_url: string
          whatsapp_phone: string
        }[]
      }
      tenant_reviews_url: { Args: { p_tenant_id: string }; Returns: string }
      tenant_theme: {
        Args: { p_tenant_id: string }
        Returns: {
          background_color: string
          body_font: string
          color_mode: string
          heading_font: string
          logo_path: string | null
          primary_color: string
          radius: number
          secondary_color: string
          tenant_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "tenant_themes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      trash_tables: { Args: never; Returns: string[] }
      unit_busy_nights: {
        Args: { p_from: string; p_to: string; p_unit_id: string }
        Returns: {
          nights: unknown
        }[]
      }
      upsell_tick: { Args: never; Returns: number }
      write_audit: {
        Args: {
          p_action: string
          p_data?: Json
          p_entity: string
          p_entity_id?: string
          p_tenant_id: string
        }
        Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
