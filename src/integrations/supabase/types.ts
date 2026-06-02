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
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      challenge_results: {
        Row: {
          both_agree: boolean
          created_at: string
          id: string
          partner_id: string | null
          payment: string | null
          picks: Json
          reward: string | null
          user_id: string
        }
        Insert: {
          both_agree?: boolean
          created_at?: string
          id?: string
          partner_id?: string | null
          payment?: string | null
          picks?: Json
          reward?: string | null
          user_id: string
        }
        Update: {
          both_agree?: boolean
          created_at?: string
          id?: string
          partner_id?: string | null
          payment?: string | null
          picks?: Json
          reward?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      game_results: {
        Row: {
          archetype: string | null
          attempts: Json | null
          created_at: string
          emotional_score: number | null
          id: string
          logic_score: number | null
          memory_score: number | null
          pattern_score: number | null
          total_score: number | null
          user_id: string
        }
        Insert: {
          archetype?: string | null
          attempts?: Json | null
          created_at?: string
          emotional_score?: number | null
          id?: string
          logic_score?: number | null
          memory_score?: number | null
          pattern_score?: number | null
          total_score?: number | null
          user_id: string
        }
        Update: {
          archetype?: string | null
          attempts?: Json | null
          created_at?: string
          emotional_score?: number | null
          id?: string
          logic_score?: number | null
          memory_score?: number | null
          pattern_score?: number | null
          total_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          compatibility_score: number | null
          created_at: string
          id: string
          matched_user_id: string
          matched_user_interested: boolean | null
          mutual_interest: boolean | null
          reveal_stage: Database["public"]["Enums"]["reveal_stage"] | null
          user_id: string
          user_interested: boolean | null
        }
        Insert: {
          compatibility_score?: number | null
          created_at?: string
          id?: string
          matched_user_id: string
          matched_user_interested?: boolean | null
          mutual_interest?: boolean | null
          reveal_stage?: Database["public"]["Enums"]["reveal_stage"] | null
          user_id: string
          user_interested?: boolean | null
        }
        Update: {
          compatibility_score?: number | null
          created_at?: string
          id?: string
          matched_user_id?: string
          matched_user_interested?: boolean | null
          mutual_interest?: boolean | null
          reveal_stage?: Database["public"]["Enums"]["reveal_stage"] | null
          user_id?: string
          user_interested?: boolean | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          flagged: boolean | null
          id: string
          message_type: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          flagged?: boolean | null
          id?: string
          message_type?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          flagged?: boolean | null
          id?: string
          message_type?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_answers: {
        Row: {
          answers: Json
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          archetype: string | null
          bio: string | null
          city: string | null
          communication_style: Json | null
          compatibility_score: number | null
          created_at: string
          curiosity_level: number | null
          email: string | null
          emotional_rhythm: Json | null
          first_name: string | null
          game_complete: boolean | null
          gender: string | null
          id: string
          intention: string | null
          interested_in: string | null
          onboarding_complete: boolean | null
          photo_reveal_stage: Database["public"]["Enums"]["reveal_stage"] | null
          photo_url: string | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at: string
          verified: boolean | null
        }
        Insert: {
          age?: number | null
          archetype?: string | null
          bio?: string | null
          city?: string | null
          communication_style?: Json | null
          compatibility_score?: number | null
          created_at?: string
          curiosity_level?: number | null
          email?: string | null
          emotional_rhythm?: Json | null
          first_name?: string | null
          game_complete?: boolean | null
          gender?: string | null
          id: string
          intention?: string | null
          interested_in?: string | null
          onboarding_complete?: boolean | null
          photo_reveal_stage?:
            | Database["public"]["Enums"]["reveal_stage"]
            | null
          photo_url?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string
          verified?: boolean | null
        }
        Update: {
          age?: number | null
          archetype?: string | null
          bio?: string | null
          city?: string | null
          communication_style?: Json | null
          compatibility_score?: number | null
          created_at?: string
          curiosity_level?: number | null
          email?: string | null
          emotional_rhythm?: Json | null
          first_name?: string | null
          game_complete?: boolean | null
          gender?: string | null
          id?: string
          intention?: string | null
          interested_in?: string | null
          onboarding_complete?: boolean | null
          photo_reveal_stage?:
            | Database["public"]["Enums"]["reveal_stage"]
            | null
          photo_url?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      puzzle_scores: {
        Row: {
          id: string
          puzzle_id: string
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          puzzle_id: string
          score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          puzzle_id?: string
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"] | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"] | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"] | null
        }
        Relationships: []
      }
      spark_answers: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          question: string
          user_id: string
        }
        Insert: {
          answer: string
          category: string
          created_at?: string
          id?: string
          question: string
          user_id: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          question?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
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
      voice_prompts: {
        Row: {
          audio_url: string
          created_at: string
          duration_seconds: number | null
          id: string
          prompt: string
          user_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          prompt: string
          user_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          prompt?: string
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
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
      app_role: "admin" | "moderator" | "user"
      report_status: "pending" | "reviewing" | "resolved" | "dismissed"
      reveal_stage: "stage_1" | "stage_2" | "stage_3"
      subscription_tier: "free" | "unveil_plus" | "unveil_black"
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
      report_status: ["pending", "reviewing", "resolved", "dismissed"],
      reveal_stage: ["stage_1", "stage_2", "stage_3"],
      subscription_tier: ["free", "unveil_plus", "unveil_black"],
    },
  },
} as const
