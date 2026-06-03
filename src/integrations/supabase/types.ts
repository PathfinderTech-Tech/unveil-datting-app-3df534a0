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
      analytics_events: {
        Row: {
          created_at: string
          event: string
          id: string
          properties: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          properties?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          properties?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      badges_catalog: {
        Row: {
          created_at: string
          criteria: Json | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id: string
          name: string
        }
        Update: {
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
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
      challenge_packs: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          premium: boolean | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id: string
          name: string
          premium?: boolean | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          premium?: boolean | null
        }
        Relationships: []
      }
      challenge_questions: {
        Row: {
          created_at: string
          id: string
          meta: Json | null
          options: Json | null
          pack_id: string
          prompt: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta?: Json | null
          options?: Json | null
          pack_id: string
          prompt: string
        }
        Update: {
          created_at?: string
          id?: string
          meta?: Json | null
          options?: Json | null
          pack_id?: string
          prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_questions_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "challenge_packs"
            referencedColumns: ["id"]
          },
        ]
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
      challenges: {
        Row: {
          active: boolean
          category: string
          created_at: string
          difficulty: number
          explanation: string | null
          id: string
          option_a: string | null
          option_b: string | null
          option_c: string | null
          question: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          difficulty?: number
          explanation?: string | null
          id?: string
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          question: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          difficulty?: number
          explanation?: string | null
          id?: string
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          question?: string
        }
        Relationships: []
      }
      content_completions: {
        Row: {
          answer: string | null
          content_id: string
          content_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          answer?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
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
      daily_answers: {
        Row: {
          answer: string
          created_at: string
          day_key: string
          id: string
          question_id: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          day_key?: string
          id?: string
          question_id: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          day_key?: string
          id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "daily_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_questions: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: string
          options: Json
          prompt: string
          weight: number
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          id?: string
          options?: Json
          prompt: string
          weight?: number
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          options?: Json
          prompt?: string
          weight?: number
        }
        Relationships: []
      }
      date_plans: {
        Row: {
          created_at: string
          date_type: string
          id: string
          invitee_id: string
          location: string | null
          notes: string | null
          proposed_at: string | null
          proposer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_type: string
          id?: string
          invitee_id: string
          location?: string | null
          notes?: string | null
          proposed_at?: string | null
          proposer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_type?: string
          id?: string
          invitee_id?: string
          location?: string | null
          notes?: string | null
          proposed_at?: string | null
          proposer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          app_version: string | null
          created_at: string
          id: string
          last_seen_at: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          id?: string
          last_seen_at?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          id?: string
          last_seen_at?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: []
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
      feedback: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          status: string
          subject: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          message: string
          status?: string
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          status?: string
          subject?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      first_impression_responses: {
        Row: {
          card_id: string
          created_at: string
          id: string
          pick: string
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          pick: string
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          pick?: string
          user_id?: string
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
      hidden_match_views: {
        Row: {
          created_at: string
          id: string
          kind: string
          target_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          target_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          target_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          chemistry_score: number | null
          compatibility_score: number | null
          connection_score: number | null
          created_at: string
          id: string
          interaction_count: number | null
          matched_user_id: string
          matched_user_interested: boolean | null
          mutual_interest: boolean | null
          passed: boolean
          reveal_stage: Database["public"]["Enums"]["reveal_stage"] | null
          saved: boolean
          share_matched_consent: boolean | null
          share_unlocked: boolean | null
          share_user_consent: boolean | null
          user_id: string
          user_interested: boolean | null
        }
        Insert: {
          chemistry_score?: number | null
          compatibility_score?: number | null
          connection_score?: number | null
          created_at?: string
          id?: string
          interaction_count?: number | null
          matched_user_id: string
          matched_user_interested?: boolean | null
          mutual_interest?: boolean | null
          passed?: boolean
          reveal_stage?: Database["public"]["Enums"]["reveal_stage"] | null
          saved?: boolean
          share_matched_consent?: boolean | null
          share_unlocked?: boolean | null
          share_user_consent?: boolean | null
          user_id: string
          user_interested?: boolean | null
        }
        Update: {
          chemistry_score?: number | null
          compatibility_score?: number | null
          connection_score?: number | null
          created_at?: string
          id?: string
          interaction_count?: number | null
          matched_user_id?: string
          matched_user_interested?: boolean | null
          mutual_interest?: boolean | null
          passed?: boolean
          reveal_stage?: Database["public"]["Enums"]["reveal_stage"] | null
          saved?: boolean
          share_matched_consent?: boolean | null
          share_unlocked?: boolean | null
          share_user_consent?: boolean | null
          user_id?: string
          user_interested?: boolean | null
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: []
      }
      message_reads: {
        Row: {
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          delivered_at: string | null
          flagged: boolean | null
          id: string
          media_type: string | null
          media_url: string | null
          message_type: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          flagged?: boolean | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_type?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          flagged?: boolean | null
          id?: string
          media_type?: string | null
          media_url?: string | null
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
      personality_blueprint: {
        Row: {
          attachment_style: string | null
          communication_style: string | null
          conflict_style: string | null
          leadership_style: string | null
          notes: Json
          relationship_style: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_style?: string | null
          communication_style?: string | null
          conflict_style?: string | null
          leadership_style?: string | null
          notes?: Json
          relationship_style?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_style?: string | null
          communication_style?: string | null
          conflict_style?: string | null
          leadership_style?: string | null
          notes?: Json
          relationship_style?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          archetype: string | null
          avatar_generated_at: string | null
          avatar_style: string | null
          avatar_url: string | null
          badge_paid: boolean
          beta_member: boolean
          bio: string | null
          city: string | null
          communication_style: Json | null
          compatibility_score: number | null
          connection_score: number | null
          country: string | null
          created_at: string
          curiosity_level: number | null
          discovery_radius_km: number
          emotional_rhythm: Json | null
          first_name: string | null
          game_complete: boolean | null
          gender: string | null
          id: string
          intention: string | null
          interested_in: string | null
          interests: string[] | null
          lat_approx: number | null
          lng_approx: number | null
          location_enabled: boolean
          location_privacy: string
          location_updated_at: string | null
          onboarding_complete: boolean | null
          personality_axes: Json
          photo_reveal_stage: Database["public"]["Enums"]["reveal_stage"] | null
          photo_url: string | null
          preferred_language: string | null
          premium_until: string | null
          profile_photo_url: string | null
          readiness_breakdown: Json
          readiness_score: number
          relationship_intent: string | null
          state_region: string | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          trust_score: number | null
          updated_at: string
          verified: boolean | null
        }
        Insert: {
          age?: number | null
          archetype?: string | null
          avatar_generated_at?: string | null
          avatar_style?: string | null
          avatar_url?: string | null
          badge_paid?: boolean
          beta_member?: boolean
          bio?: string | null
          city?: string | null
          communication_style?: Json | null
          compatibility_score?: number | null
          connection_score?: number | null
          country?: string | null
          created_at?: string
          curiosity_level?: number | null
          discovery_radius_km?: number
          emotional_rhythm?: Json | null
          first_name?: string | null
          game_complete?: boolean | null
          gender?: string | null
          id: string
          intention?: string | null
          interested_in?: string | null
          interests?: string[] | null
          lat_approx?: number | null
          lng_approx?: number | null
          location_enabled?: boolean
          location_privacy?: string
          location_updated_at?: string | null
          onboarding_complete?: boolean | null
          personality_axes?: Json
          photo_reveal_stage?:
            | Database["public"]["Enums"]["reveal_stage"]
            | null
          photo_url?: string | null
          preferred_language?: string | null
          premium_until?: string | null
          profile_photo_url?: string | null
          readiness_breakdown?: Json
          readiness_score?: number
          relationship_intent?: string | null
          state_region?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          trust_score?: number | null
          updated_at?: string
          verified?: boolean | null
        }
        Update: {
          age?: number | null
          archetype?: string | null
          avatar_generated_at?: string | null
          avatar_style?: string | null
          avatar_url?: string | null
          badge_paid?: boolean
          beta_member?: boolean
          bio?: string | null
          city?: string | null
          communication_style?: Json | null
          compatibility_score?: number | null
          connection_score?: number | null
          country?: string | null
          created_at?: string
          curiosity_level?: number | null
          discovery_radius_km?: number
          emotional_rhythm?: Json | null
          first_name?: string | null
          game_complete?: boolean | null
          gender?: string | null
          id?: string
          intention?: string | null
          interested_in?: string | null
          interests?: string[] | null
          lat_approx?: number | null
          lng_approx?: number | null
          location_enabled?: boolean
          location_privacy?: string
          location_updated_at?: string | null
          onboarding_complete?: boolean | null
          personality_axes?: Json
          photo_reveal_stage?:
            | Database["public"]["Enums"]["reveal_stage"]
            | null
          photo_url?: string | null
          preferred_language?: string | null
          premium_until?: string | null
          profile_photo_url?: string | null
          readiness_breakdown?: Json
          readiness_score?: number
          relationship_intent?: string | null
          state_region?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          trust_score?: number | null
          updated_at?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      puzzle_content: {
        Row: {
          answer: string
          created_at: string
          difficulty: number | null
          id: string
          meta: Json | null
          options: Json | null
          prompt: string
          puzzle_type: string
        }
        Insert: {
          answer: string
          created_at?: string
          difficulty?: number | null
          id?: string
          meta?: Json | null
          options?: Json | null
          prompt: string
          puzzle_type: string
        }
        Update: {
          answer?: string
          created_at?: string
          difficulty?: number | null
          id?: string
          meta?: Json | null
          options?: Json | null
          prompt?: string
          puzzle_type?: string
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
      puzzles: {
        Row: {
          active: boolean
          answer: string
          category: string
          created_at: string
          difficulty: number
          explanation: string | null
          id: string
          puzzle: string
        }
        Insert: {
          active?: boolean
          answer: string
          category: string
          created_at?: string
          difficulty?: number
          explanation?: string | null
          id?: string
          puzzle: string
        }
        Update: {
          active?: boolean
          answer?: string
          category?: string
          created_at?: string
          difficulty?: number
          explanation?: string | null
          id?: string
          puzzle?: string
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
      reveal_progress: {
        Row: {
          day: number
          id: string
          match_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          day?: number
          id?: string
          match_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          day?: number
          id?: string
          match_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_profiles: {
        Row: {
          created_at: string
          id: string
          target_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      shared_contacts: {
        Row: {
          created_at: string
          id: string
          instagram: string | null
          matched_user_id: string
          phone: string | null
          telegram: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          instagram?: string | null
          matched_user_id: string
          phone?: string | null
          telegram?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          instagram?: string | null
          matched_user_id?: string
          phone?: string | null
          telegram?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
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
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string | null
          product_id: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          product_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          product_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"] | null
          updated_at?: string
          user_id?: string
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
      transactions: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          description: string | null
          environment: string
          id: string
          kind: string
          price_id: string | null
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          description?: string | null
          environment?: string
          id?: string
          kind: string
          price_id?: string | null
          status: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          description?: string | null
          environment?: string
          id?: string
          kind?: string
          price_id?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
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
      verification_payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          environment: string
          id: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          country: string | null
          created_at: string
          date_of_birth: string | null
          id: string
          id_back_url: string | null
          id_front_url: string | null
          id_type: string | null
          legal_first_name: string | null
          legal_last_name: string | null
          profile_photo_url: string | null
          reviewed_at: string | null
          reviewer_notes: string | null
          selfie_url: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          id_type?: string | null
          legal_first_name?: string | null
          legal_last_name?: string | null
          profile_photo_url?: string | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          id_type?: string | null
          legal_first_name?: string | null
          legal_last_name?: string | null
          profile_photo_url?: string | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
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
          approved_at: string | null
          country: string | null
          created_at: string
          email: string
          first_name: string | null
          gender: string | null
          id: string
          relationship_goal: string | null
          reviewed_at: string | null
          reviewer_notes: string | null
          source: string | null
          status: string
        }
        Insert: {
          approved_at?: string | null
          country?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          gender?: string | null
          id?: string
          relationship_goal?: string | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          source?: string | null
          status?: string
        }
        Update: {
          approved_at?: string | null
          country?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          gender?: string | null
          id?: string
          relationship_goal?: string | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          source?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      puzzle_content_public: {
        Row: {
          created_at: string | null
          difficulty: number | null
          id: string | null
          meta: Json | null
          options: Json | null
          prompt: string | null
          puzzle_type: string | null
        }
        Insert: {
          created_at?: string | null
          difficulty?: number | null
          id?: string | null
          meta?: Json | null
          options?: Json | null
          prompt?: string | null
          puzzle_type?: string | null
        }
        Update: {
          created_at?: string | null
          difficulty?: number | null
          id?: string | null
          meta?: Json | null
          options?: Json | null
          prompt?: string | null
          puzzle_type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      compute_compatibility: {
        Args: { _a: string; _b: string }
        Returns: {
          communication: number
          friction: string[]
          goals: number
          lifestyle: number
          overall: number
          strengths: string[]
          values_score: number
        }[]
      }
      compute_readiness_score: { Args: { _uid: string }; Returns: number }
      compute_why_we_match: {
        Args: { _a: string; _b: string }
        Returns: {
          challenges: string[]
          communication_dynamics: string
          complementary_score: number
          growth_opportunities: string[]
          shared_values: string[]
          similarity_score: number
          strengths: string[]
        }[]
      }
      consent_share_contact: {
        Args: { _match_user: string }
        Returns: {
          unlocked: boolean
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      discover_hidden_matches: {
        Args: { _limit?: number }
        Returns: {
          age: number
          archetype: string
          bio: string
          city: string
          complementary_score: number
          country: string
          first_name: string
          growth_opportunities: string[]
          id: string
          photo_url: string
          shared_values: string[]
          similarity_score: number
        }[]
      }
      discover_profiles: {
        Args: {
          _age_max?: number
          _age_min?: number
          _country?: string
          _intent?: string
          _language?: string
          _limit?: number
          _nearby_only?: boolean
          _radius_km?: number
        }
        Returns: {
          age: number
          archetype: string
          bio: string
          city: string
          compatibility_score: number
          country: string
          curiosity_level: number
          distance_km: number
          emotional_rhythm: Json
          first_name: string
          gender: string
          id: string
          intention: string
          interested_in: string
          lat_approx: number
          lng_approx: number
          location_enabled: boolean
          location_privacy: string
          photo_reveal_stage: Database["public"]["Enums"]["reveal_stage"]
          photo_url: string
          preferred_language: string
          relationship_intent: string
          strengths: string[]
          verified: boolean
        }[]
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_email_approved: { Args: { _email: string }; Returns: boolean }
      like_profile: {
        Args: { _target: string }
        Returns: {
          conversation_id: string
          match_id: string
          mutual: boolean
        }[]
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
      pass_profile: { Args: { _target: string }; Returns: undefined }
      profile_axes: { Args: { _uid: string }; Returns: Json }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
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
