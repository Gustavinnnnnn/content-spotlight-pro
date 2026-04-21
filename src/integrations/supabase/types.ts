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
      club_settings: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string
          id: string
          likes_count: number
          name: string
          photos_count: number
          posts_count: number
          updated_at: string
          verified: boolean
          videos_count: number
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          likes_count?: number
          name?: string
          photos_count?: number
          posts_count?: number
          updated_at?: string
          verified?: boolean
          videos_count?: number
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          likes_count?: number
          name?: string
          photos_count?: number
          posts_count?: number
          updated_at?: string
          verified?: boolean
          videos_count?: number
        }
        Relationships: []
      }
      media_items: {
        Row: {
          blurred: boolean
          created_at: string
          id: string
          sort_order: number
          thumbnail_url: string | null
          title: string | null
          type: string
          url: string
        }
        Insert: {
          blurred?: boolean
          created_at?: string
          id?: string
          sort_order?: number
          thumbnail_url?: string | null
          title?: string | null
          type: string
          url: string
        }
        Update: {
          blurred?: boolean
          created_at?: string
          id?: string
          sort_order?: number
          thumbnail_url?: string | null
          title?: string | null
          type?: string
          url?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          active: boolean
          badge: string | null
          checkout_url: string | null
          color: string
          created_at: string
          description: string | null
          highlighted: boolean
          id: string
          name: string
          price_label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          badge?: string | null
          checkout_url?: string | null
          color?: string
          created_at?: string
          description?: string | null
          highlighted?: boolean
          id?: string
          name: string
          price_label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          badge?: string | null
          checkout_url?: string | null
          color?: string
          created_at?: string
          description?: string | null
          highlighted?: boolean
          id?: string
          name?: string
          price_label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      post_purchase_fees: {
        Row: {
          active: boolean
          amount: number
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          subscription: Json
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          subscription: Json
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          subscription?: Json
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      site_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          plan_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          plan_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_events_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
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
      telegram_messages: {
        Row: {
          chat_id: number
          created_at: string
          first_name: string | null
          raw_update: Json
          text: string | null
          update_id: number
          username: string | null
        }
        Insert: {
          chat_id: number
          created_at?: string
          first_name?: string | null
          raw_update: Json
          text?: string | null
          update_id: number
          username?: string | null
        }
        Update: {
          chat_id?: number
          created_at?: string
          first_name?: string | null
          raw_update?: Json
          text?: string | null
          update_id?: number
          username?: string | null
        }
        Relationships: []
      }
      telegram_settings: {
        Row: {
          active: boolean
          admin_chat_id: number | null
          bot_token: string | null
          button_text: string
          created_at: string
          id: string
          sale_notification_message: string
          sale_notifications_enabled: boolean
          updated_at: string
          vip_invite_link: string | null
          vip_message: string
          webapp_url: string | null
          welcome_media_type: string | null
          welcome_media_url: string | null
          welcome_message: string
        }
        Insert: {
          active?: boolean
          admin_chat_id?: number | null
          bot_token?: string | null
          button_text?: string
          created_at?: string
          id?: string
          sale_notification_message?: string
          sale_notifications_enabled?: boolean
          updated_at?: string
          vip_invite_link?: string | null
          vip_message?: string
          webapp_url?: string | null
          welcome_media_type?: string | null
          welcome_media_url?: string | null
          welcome_message?: string
        }
        Update: {
          active?: boolean
          admin_chat_id?: number | null
          bot_token?: string | null
          button_text?: string
          created_at?: string
          id?: string
          sale_notification_message?: string
          sale_notifications_enabled?: boolean
          updated_at?: string
          vip_invite_link?: string | null
          vip_message?: string
          webapp_url?: string | null
          welcome_media_type?: string | null
          welcome_media_url?: string | null
          welcome_message?: string
        }
        Relationships: []
      }
      transaction_fees: {
        Row: {
          amount: number
          created_at: string
          expires_at: string | null
          fee_description: string | null
          fee_id: string | null
          fee_name: string
          id: string
          paid_at: string | null
          paradise_transaction_id: string | null
          qr_code: string | null
          qr_code_base64: string | null
          raw_payload: Json | null
          reference: string
          sort_order: number
          status: string
          transaction_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          expires_at?: string | null
          fee_description?: string | null
          fee_id?: string | null
          fee_name: string
          id?: string
          paid_at?: string | null
          paradise_transaction_id?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          raw_payload?: Json | null
          reference: string
          sort_order?: number
          status?: string
          transaction_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          expires_at?: string | null
          fee_description?: string | null
          fee_id?: string | null
          fee_name?: string
          id?: string
          paid_at?: string | null
          paradise_transaction_id?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          raw_payload?: Json | null
          reference?: string
          sort_order?: number
          status?: string
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_fees_fee_id_fkey"
            columns: ["fee_id"]
            isOneToOne: false
            referencedRelation: "post_purchase_fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_fees_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          customer_document: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          expires_at: string | null
          id: string
          paradise_transaction_id: string | null
          plan_id: string | null
          plan_name: string | null
          qr_code: string | null
          qr_code_base64: string | null
          raw_payload: Json | null
          reference: string
          status: string
          telegram_chat_id: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_document?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          expires_at?: string | null
          id?: string
          paradise_transaction_id?: string | null
          plan_id?: string | null
          plan_name?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          raw_payload?: Json | null
          reference: string
          status?: string
          telegram_chat_id?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_document?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          expires_at?: string | null
          id?: string
          paradise_transaction_id?: string | null
          plan_id?: string | null
          plan_name?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          raw_payload?: Json | null
          reference?: string
          status?: string
          telegram_chat_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
