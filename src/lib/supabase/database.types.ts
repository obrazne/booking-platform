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
      ical_channels: {
        Row: {
          active: boolean
          created_at: string
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
      occupancy: {
        Row: {
          conflict: boolean
          created_at: string
          created_by: string | null
          expires_at: string | null
          ical_channel_id: string | null
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
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          ical_channel_id?: string | null
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
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          ical_channel_id?: string | null
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
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          locale: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          locale?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          locale?: string
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
      property_private: {
        Row: {
          arrival_instructions: Json
          property_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          arrival_instructions?: Json
          property_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          arrival_instructions?: Json
          property_id?: string
          tenant_id?: string
          updated_at?: string
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
      property_terms: {
        Row: {
          property_id: string
          tenant_id: string
          term_id: string
        }
        Insert: {
          property_id: string
          tenant_id: string
          term_id: string
        }
        Update: {
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
          arrival_email_days_before: number
          bic: string | null
          cancellation_policy: Json
          contact_name: string | null
          contact_phone: string | null
          hold_minutes: number
          iban: string | null
          owner_notification_email: string | null
          payment_due_hours: number
          privacy_url: string | null
          tenant_id: string
          terms_url: string | null
          updated_at: string
          vat_payer: boolean
          website_url: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          account_holder?: string | null
          arrival_email_days_before?: number
          bic?: string | null
          cancellation_policy?: Json
          contact_name?: string | null
          contact_phone?: string | null
          hold_minutes?: number
          iban?: string | null
          owner_notification_email?: string | null
          payment_due_hours?: number
          privacy_url?: string | null
          tenant_id: string
          terms_url?: string | null
          updated_at?: string
          vat_payer?: boolean
          website_url?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          account_holder?: string | null
          arrival_email_days_before?: number
          bic?: string | null
          cancellation_policy?: Json
          contact_name?: string | null
          contact_phone?: string | null
          hold_minutes?: number
          iban?: string | null
          owner_notification_email?: string | null
          payment_due_hours?: number
          privacy_url?: string | null
          tenant_id?: string
          terms_url?: string | null
          updated_at?: string
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
      dismiss_cancellation_request: {
        Args: { p_reservation_id: string }
        Returns: undefined
      }
      expire_pending_reservations: { Args: never; Returns: string[] }
      free_units: {
        Args: { p_check_in: string; p_check_out: string; p_tenant_id: string }
        Returns: {
          property_id: string
          unit_id: string
        }[]
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
      my_tenant_ids: { Args: never; Returns: string[] }
      next_reservation_number: {
        Args: { p_tenant_id: string }
        Returns: string
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
      purge_expired_holds: { Args: { p_unit_id: string }; Returns: undefined }
      release_hold: { Args: { p_hold_id: string }; Returns: undefined }
      request_cancellation: {
        Args: { p_note?: string; p_token: string }
        Returns: boolean
      }
      reservation_by_token: { Args: { p_token: string }; Returns: Json }
      set_reservation_progress: {
        Args: { p_reservation_id: string; p_status: string }
        Returns: undefined
      }
      stay_nights: {
        Args: { p_check_in: string; p_check_out: string; p_unit_id: string }
        Returns: unknown
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
      tenant_public_contact: {
        Args: { p_tenant_id: string }
        Returns: {
          contact_name: string
          contact_phone: string
          website_url: string
          whatsapp_phone: string
        }[]
      }
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
      unit_busy_nights: {
        Args: { p_from: string; p_to: string; p_unit_id: string }
        Returns: {
          nights: unknown
        }[]
      }
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
