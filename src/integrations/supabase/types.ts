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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          account_no: string
          address: string
          bank_name: string
          created_at: string
          created_by: string
          email: string
          gstin: string
          id: string
          ifsc: string
          invoice_prefix: string
          legal_name: string
          name: string
          pan: string
          phone: string
          quote_prefix: string
          state: string
          state_code: string
          terms: string[]
          upi_id: string
          website: string
        }
        Insert: {
          account_no?: string
          address?: string
          bank_name?: string
          created_at?: string
          created_by?: string
          email?: string
          gstin?: string
          id?: string
          ifsc?: string
          invoice_prefix?: string
          legal_name?: string
          name: string
          pan?: string
          phone?: string
          quote_prefix?: string
          state?: string
          state_code?: string
          terms?: string[]
          upi_id?: string
          website?: string
        }
        Update: {
          account_no?: string
          address?: string
          bank_name?: string
          created_at?: string
          created_by?: string
          email?: string
          gstin?: string
          id?: string
          ifsc?: string
          invoice_prefix?: string
          legal_name?: string
          name?: string
          pan?: string
          phone?: string
          quote_prefix?: string
          state?: string
          state_code?: string
          terms?: string[]
          upi_id?: string
          website?: string
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      docs: {
        Row: {
          company_id: string
          converted_to: string | null
          created_at: string
          date: string
          due_date: string | null
          follow_up_date: string | null
          id: string
          items: Json
          kind: string
          notes: string | null
          number: string
          party_id: string | null
          po_ref: string | null
          status: string
        }
        Insert: {
          company_id: string
          converted_to?: string | null
          created_at?: string
          date?: string
          due_date?: string | null
          follow_up_date?: string | null
          id?: string
          items?: Json
          kind: string
          notes?: string | null
          number: string
          party_id?: string | null
          po_ref?: string | null
          status?: string
        }
        Update: {
          company_id?: string
          converted_to?: string | null
          created_at?: string
          date?: string
          due_date?: string | null
          follow_up_date?: string | null
          id?: string
          items?: Json
          kind?: string
          notes?: string | null
          number?: string
          party_id?: string | null
          po_ref?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "docs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docs_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      parties: {
        Row: {
          billing_address: string
          company_id: string
          created_at: string
          credit_limit: number
          email: string
          gstin: string
          id: string
          name: string
          opening_balance: number
          pan: string
          phone: string
          shipping_address: string
          state: string
          state_code: string
          type: string
        }
        Insert: {
          billing_address?: string
          company_id: string
          created_at?: string
          credit_limit?: number
          email?: string
          gstin?: string
          id?: string
          name: string
          opening_balance?: number
          pan?: string
          phone?: string
          shipping_address?: string
          state?: string
          state_code?: string
          type?: string
        }
        Update: {
          billing_address?: string
          company_id?: string
          created_at?: string
          credit_limit?: number
          email?: string
          gstin?: string
          id?: string
          name?: string
          opening_balance?: number
          pan?: string
          phone?: string
          shipping_address?: string
          state?: string
          state_code?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "parties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          date: string
          direction: string
          id: string
          invoice_id: string | null
          mode: string
          note: string | null
          party_id: string | null
          reference: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          date?: string
          direction?: string
          id?: string
          invoice_id?: string | null
          mode?: string
          note?: string | null
          party_id?: string | null
          reference?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          date?: string
          direction?: string
          id?: string
          invoice_id?: string | null
          mode?: string
          note?: string | null
          party_id?: string | null
          reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "docs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string
          company_id: string
          cost_price: number
          created_at: string
          hsn: string
          id: string
          min_qty: number
          name: string
          selling_price: number
          sku: string
          stock: number
          tax_rate: number
          unit: string
        }
        Insert: {
          brand?: string
          company_id: string
          cost_price?: number
          created_at?: string
          hsn?: string
          id?: string
          min_qty?: number
          name: string
          selling_price?: number
          sku?: string
          stock?: number
          tax_rate?: number
          unit?: string
        }
        Update: {
          brand?: string
          company_id?: string
          cost_price?: number
          created_at?: string
          hsn?: string
          id?: string
          min_qty?: number
          name?: string
          selling_price?: number
          sku?: string
          stock?: number
          tax_rate?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_company_role: {
        Args: {
          _company_id: string
          _roles: Database["public"]["Enums"]["app_role"][]
        }
        Returns: boolean
      }
      is_company_member: { Args: { _company_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "ADMIN" | "SALES" | "ACCOUNTS" | "WAREHOUSE"
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
      app_role: ["ADMIN", "SALES", "ACCOUNTS", "WAREHOUSE"],
    },
  },
} as const
