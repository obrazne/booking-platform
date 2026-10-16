// Generated from the staging database (npm run db:types). Do not edit by hand.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          data: Json;
          entity: string;
          entity_id: string | null;
          id: number;
          tenant_id: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          data?: Json;
          entity: string;
          entity_id?: string | null;
          id?: never;
          tenant_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          data?: Json;
          entity?: string;
          entity_id?: string | null;
          id?: never;
          tenant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_log_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      memberships: {
        Row: {
          created_at: string;
          id: string;
          role: string;
          tenant_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: string;
          tenant_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: string;
          tenant_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      modules: {
        Row: {
          created_at: string;
          key: string;
        };
        Insert: {
          created_at?: string;
          key: string;
        };
        Update: {
          created_at?: string;
          key?: string;
        };
        Relationships: [];
      };
      platform_admins: {
        Row: {
          created_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "platform_admins_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          locale: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          locale?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          locale?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tenant_domains: {
        Row: {
          created_at: string;
          hostname: string;
          id: string;
          is_primary: boolean;
          tenant_id: string;
        };
        Insert: {
          created_at?: string;
          hostname: string;
          id?: string;
          is_primary?: boolean;
          tenant_id: string;
        };
        Update: {
          created_at?: string;
          hostname?: string;
          id?: string;
          is_primary?: boolean;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_domains_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenant_modules: {
        Row: {
          module_key: string;
          status: string;
          tenant_id: string;
          trial_ends_at: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          module_key: string;
          status?: string;
          tenant_id: string;
          trial_ends_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          module_key?: string;
          status?: string;
          tenant_id?: string;
          trial_ends_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_modules_module_key_fkey";
            columns: ["module_key"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "tenant_modules_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenant_modules_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tenant_themes: {
        Row: {
          background_color: string;
          body_font: string;
          color_mode: string;
          heading_font: string;
          logo_path: string | null;
          primary_color: string;
          radius: number;
          secondary_color: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          background_color?: string;
          body_font?: string;
          color_mode?: string;
          heading_font?: string;
          logo_path?: string | null;
          primary_color?: string;
          radius?: number;
          secondary_color?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          background_color?: string;
          body_font?: string;
          color_mode?: string;
          heading_font?: string;
          logo_path?: string | null;
          primary_color?: string;
          radius?: number;
          secondary_color?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_themes_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: true;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenants: {
        Row: {
          country: string;
          created_at: string;
          currency: string;
          default_locale: string;
          id: string;
          locales: string[];
          name: string;
          slug: string;
          status: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          country?: string;
          created_at?: string;
          currency?: string;
          default_locale?: string;
          id?: string;
          locales?: string[];
          name: string;
          slug: string;
          status?: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          country?: string;
          created_at?: string;
          currency?: string;
          default_locale?: string;
          id?: string;
          locales?: string[];
          name?: string;
          slug?: string;
          status?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_platform_admin: { Args: never; Returns: boolean };
      is_module_enabled: {
        Args: { p_module_key: string; p_tenant_id: string };
        Returns: boolean;
      };
      is_tenant_member: {
        Args: { p_roles?: string[]; p_tenant_id: string };
        Returns: boolean;
      };
      my_tenant_ids: { Args: never; Returns: string[] };
      platform_create_tenant: {
        Args: {
          p_country?: string;
          p_currency?: string;
          p_hostname: string;
          p_name: string;
          p_slug: string;
        };
        Returns: string;
      };
      platform_set_module: {
        Args: {
          p_module_key: string;
          p_status: string;
          p_tenant_id: string;
          p_trial_ends_at?: string;
        };
        Returns: undefined;
      };
      platform_set_tenant_status: {
        Args: { p_status: string; p_tenant_id: string };
        Returns: undefined;
      };
      tenant_by_host: {
        Args: { p_host: string };
        Returns: {
          country: string;
          currency: string;
          default_locale: string;
          id: string;
          locales: string[];
          name: string;
          slug: string;
        }[];
      };
      tenant_theme: {
        Args: { p_tenant_id: string };
        Returns: Database["public"]["Tables"]["tenant_themes"]["Row"][];
      };
      write_audit: {
        Args: {
          p_action: string;
          p_data?: Json;
          p_entity: string;
          p_entity_id?: string;
          p_tenant_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
