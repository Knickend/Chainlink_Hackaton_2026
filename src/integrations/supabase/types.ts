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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      asset_transactions: {
        Row: {
          asset_id: string | null
          asset_name: string
          category: string
          created_at: string | null
          destination_amount: number | null
          destination_asset_id: string | null
          destination_currency: string | null
          destination_label: string | null
          exchange_rate: number | null
          fund_flow_mode: string | null
          id: string
          notes: string | null
          price_per_unit: number
          quantity: number
          realized_pnl: number | null
          source_amount: number | null
          source_asset_id: string | null
          source_currency: string | null
          source_label: string | null
          symbol: string
          total_value: number
          transaction_date: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          asset_id?: string | null
          asset_name: string
          category: string
          created_at?: string | null
          destination_amount?: number | null
          destination_asset_id?: string | null
          destination_currency?: string | null
          destination_label?: string | null
          exchange_rate?: number | null
          fund_flow_mode?: string | null
          id?: string
          notes?: string | null
          price_per_unit: number
          quantity: number
          realized_pnl?: number | null
          source_amount?: number | null
          source_asset_id?: string | null
          source_currency?: string | null
          source_label?: string | null
          symbol: string
          total_value: number
          transaction_date?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          asset_id?: string | null
          asset_name?: string
          category?: string
          created_at?: string | null
          destination_amount?: number | null
          destination_asset_id?: string | null
          destination_currency?: string | null
          destination_label?: string | null
          exchange_rate?: number | null
          fund_flow_mode?: string | null
          id?: string
          notes?: string | null
          price_per_unit?: number
          quantity?: number
          realized_pnl?: number | null
          source_amount?: number | null
          source_asset_id?: string | null
          source_currency?: string | null
          source_label?: string | null
          symbol?: string
          total_value?: number
          transaction_date?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transactions_destination_asset_id_fkey"
            columns: ["destination_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transactions_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          category: string
          cost_basis: number | null
          created_at: string
          id: string
          name: string
          purchase_date: string | null
          purchase_price_per_unit: number | null
          quantity: number | null
          symbol: string | null
          unit: string | null
          updated_at: string
          user_id: string
          value: number
          yield: number | null
        }
        Insert: {
          category: string
          cost_basis?: number | null
          created_at?: string
          id?: string
          name: string
          purchase_date?: string | null
          purchase_price_per_unit?: number | null
          quantity?: number | null
          symbol?: string | null
          unit?: string | null
          updated_at?: string
          user_id: string
          value?: number
          yield?: number | null
        }
        Update: {
          category?: string
          cost_basis?: number | null
          created_at?: string
          id?: string
          name?: string
          purchase_date?: string | null
          purchase_price_per_unit?: number | null
          quantity?: number | null
          symbol?: string | null
          unit?: string | null
          updated_at?: string
          user_id?: string
          value?: number
          yield?: number | null
        }
        Relationships: []
      }
      cron_job_logs: {
        Row: {
          created_at: string
          details: Json | null
          error_message: string | null
          execution_time: string
          failed_count: number | null
          id: string
          job_name: string
          processed_count: number | null
          status: string
          succeeded_count: number | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          error_message?: string | null
          execution_time?: string
          failed_count?: number | null
          id?: string
          job_name: string
          processed_count?: number | null
          status: string
          succeeded_count?: number | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          error_message?: string | null
          execution_time?: string
          failed_count?: number | null
          id?: string
          job_name?: string
          processed_count?: number | null
          status?: string
          succeeded_count?: number | null
        }
        Relationships: []
      }
      debts: {
        Row: {
          created_at: string
          currency: string | null
          debt_type: string
          id: string
          interest_rate: number
          monthly_payment: number | null
          name: string
          principal_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          debt_type?: string
          id?: string
          interest_rate?: number
          monthly_payment?: number | null
          name: string
          principal_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          debt_type?: string
          id?: string
          interest_rate?: number
          monthly_payment?: number | null
          name?: string
          principal_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          currency: string | null
          expense_date: string | null
          id: string
          is_recurring: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          currency?: string | null
          expense_date?: string | null
          id?: string
          is_recurring?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string | null
          expense_date?: string | null
          id?: string
          is_recurring?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          admin_notes: string | null
          attachments: string[] | null
          created_at: string | null
          description: string
          id: string
          priority: string | null
          status: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          attachments?: string[] | null
          created_at?: string | null
          description: string
          id?: string
          priority?: string | null
          status?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          attachments?: string[] | null
          created_at?: string | null
          description?: string
          id?: string
          priority?: string | null
          status?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      financial_goals: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          currency: string
          current_amount: number
          id: string
          is_completed: boolean
          monthly_contribution: number | null
          name: string
          notes: string | null
          priority: string
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          current_amount?: number
          id?: string
          is_completed?: boolean
          monthly_contribution?: number | null
          name: string
          notes?: string | null
          priority?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          current_amount?: number
          id?: string
          is_completed?: boolean
          monthly_contribution?: number | null
          name?: string
          notes?: string | null
          priority?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      income: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          id: string
          income_date: string | null
          is_recurring: boolean
          source: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          id?: string
          income_date?: string | null
          is_recurring?: boolean
          source: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          income_date?: string | null
          is_recurring?: boolean
          source?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_snapshots: {
        Row: {
          assets_breakdown: Json | null
          created_at: string
          id: string
          monthly_debt_payments: number
          net_worth: number
          snapshot_month: string
          total_assets: number
          total_debt: number
          total_expenses: number
          total_income: number
          user_id: string
        }
        Insert: {
          assets_breakdown?: Json | null
          created_at?: string
          id?: string
          monthly_debt_payments?: number
          net_worth?: number
          snapshot_month: string
          total_assets?: number
          total_debt?: number
          total_expenses?: number
          total_income?: number
          user_id: string
        }
        Update: {
          assets_breakdown?: Json | null
          created_at?: string
          id?: string
          monthly_debt_payments?: number
          net_worth?: number
          snapshot_month?: string
          total_assets?: number
          total_debt?: number
          total_expenses?: number
          total_income?: number
          user_id?: string
        }
        Relationships: []
      }
      price_cache: {
        Row: {
          asset_type: string
          change: number | null
          change_percent: number | null
          created_at: string
          id: string
          price: number
          price_unit: string | null
          symbol: string
          updated_at: string
        }
        Insert: {
          asset_type?: string
          change?: number | null
          change_percent?: number | null
          created_at?: string
          id?: string
          price: number
          price_unit?: string | null
          symbol: string
          updated_at?: string
        }
        Update: {
          asset_type?: string
          change?: number | null
          change_percent?: number | null
          created_at?: string
          id?: string
          price?: number
          price_unit?: string | null
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agreed_to_tos: boolean | null
          agreed_to_tos_at: string | null
          created_at: string
          has_completed_tutorial: boolean | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agreed_to_tos?: boolean | null
          agreed_to_tos_at?: string | null
          created_at?: string
          has_completed_tutorial?: boolean | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agreed_to_tos?: boolean | null
          agreed_to_tos_at?: string | null
          created_at?: string
          has_completed_tutorial?: boolean | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sales_bot_interactions: {
        Row: {
          created_at: string
          cta_type: string | null
          event_type: string
          id: string
          message_role: string | null
          session_id: string
          visitor_ip_hash: string | null
        }
        Insert: {
          created_at?: string
          cta_type?: string | null
          event_type: string
          id?: string
          message_role?: string | null
          session_id: string
          visitor_ip_hash?: string | null
        }
        Update: {
          created_at?: string
          cta_type?: string | null
          event_type?: string
          id?: string
          message_role?: string | null
          session_id?: string
          visitor_ip_hash?: string | null
        }
        Relationships: []
      }
      subscription_cancellations: {
        Row: {
          additional_feedback: string | null
          created_at: string | null
          id: string
          previous_tier: string
          primary_reason: string
          user_id: string
          would_return: string | null
        }
        Insert: {
          additional_feedback?: string | null
          created_at?: string | null
          id?: string
          previous_tier: string
          primary_reason: string
          user_id: string
          would_return?: string | null
        }
        Update: {
          additional_feedback?: string | null
          created_at?: string | null
          id?: string
          previous_tier?: string
          primary_reason?: string
          user_id?: string
          would_return?: string | null
        }
        Relationships: []
      }
      user_investment_preferences: {
        Row: {
          commodities_allocation: number
          created_at: string
          crypto_allocation: number
          debt_allocation: number
          emergency_fund_target: number
          id: string
          stocks_allocation: number
          updated_at: string
          user_id: string
        }
        Insert: {
          commodities_allocation?: number
          created_at?: string
          crypto_allocation?: number
          debt_allocation?: number
          emergency_fund_target?: number
          id?: string
          stocks_allocation?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          commodities_allocation?: number
          created_at?: string
          crypto_allocation?: number
          debt_allocation?: number
          emergency_fund_target?: number
          id?: string
          stocks_allocation?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_period: string | null
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_period?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_period?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      feedback_user_view: {
        Row: {
          attachments: string[] | null
          created_at: string | null
          description: string | null
          id: string | null
          priority: string | null
          status: string | null
          title: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          priority?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attachments?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          priority?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_platform_analytics: { Args: never; Returns: Json }
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
    },
  },
} as const
