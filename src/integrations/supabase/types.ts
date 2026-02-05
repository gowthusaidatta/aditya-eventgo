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
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_id: string
          created_at: string | null
          event_id: string
          id: string
          is_valid: boolean | null
          issue_date: string | null
          pdf_url: string | null
          qr_code_url: string | null
          recipient_email: string | null
          recipient_name: string
          team_id: string | null
          template_data: Json | null
          type: Database["public"]["Enums"]["certificate_type"]
          user_id: string
          verification_url: string | null
        }
        Insert: {
          certificate_id: string
          created_at?: string | null
          event_id: string
          id?: string
          is_valid?: boolean | null
          issue_date?: string | null
          pdf_url?: string | null
          qr_code_url?: string | null
          recipient_email?: string | null
          recipient_name: string
          team_id?: string | null
          template_data?: Json | null
          type: Database["public"]["Enums"]["certificate_type"]
          user_id: string
          verification_url?: string | null
        }
        Update: {
          certificate_id?: string
          created_at?: string | null
          event_id?: string
          id?: string
          is_valid?: boolean | null
          issue_date?: string | null
          pdf_url?: string | null
          qr_code_url?: string | null
          recipient_email?: string | null
          recipient_name?: string
          team_id?: string | null
          template_data?: Json | null
          type?: Database["public"]["Enums"]["certificate_type"]
          user_id?: string
          verification_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          discount_type: string | null
          discount_value: number
          event_id: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_amount: number | null
          uses_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          discount_type?: string | null
          discount_value: number
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_amount?: number | null
          uses_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          discount_type?: string | null
          discount_value?: number
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_amount?: number | null
          uses_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          check_in_by: string | null
          check_in_time: string | null
          event_id: string
          form_responses: Json | null
          id: string
          payment_id: string | null
          qr_code: string | null
          registered_at: string
          registration_status:
            | Database["public"]["Enums"]["registration_status"]
            | null
          status: string | null
          user_id: string
          waitlist_position: number | null
        }
        Insert: {
          check_in_by?: string | null
          check_in_time?: string | null
          event_id: string
          form_responses?: Json | null
          id?: string
          payment_id?: string | null
          qr_code?: string | null
          registered_at?: string
          registration_status?:
            | Database["public"]["Enums"]["registration_status"]
            | null
          status?: string | null
          user_id: string
          waitlist_position?: number | null
        }
        Update: {
          check_in_by?: string | null
          check_in_time?: string | null
          event_id?: string
          form_responses?: Json | null
          id?: string
          payment_id?: string | null
          qr_code?: string | null
          registered_at?: string
          registration_status?:
            | Database["public"]["Enums"]["registration_status"]
            | null
          status?: string | null
          user_id?: string
          waitlist_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_schedule: {
        Row: {
          created_at: string | null
          day_number: number | null
          description: string | null
          end_time: string | null
          event_id: string
          id: string
          location: string | null
          session_type: string | null
          sort_order: number | null
          speaker_bio: string | null
          speaker_image: string | null
          speaker_name: string | null
          start_time: string
          title: string
        }
        Insert: {
          created_at?: string | null
          day_number?: number | null
          description?: string | null
          end_time?: string | null
          event_id: string
          id?: string
          location?: string | null
          session_type?: string | null
          sort_order?: number | null
          speaker_bio?: string | null
          speaker_image?: string | null
          speaker_name?: string | null
          start_time: string
          title: string
        }
        Update: {
          created_at?: string | null
          day_number?: number | null
          description?: string | null
          end_time?: string | null
          event_id?: string
          id?: string
          location?: string | null
          session_type?: string | null
          sort_order?: number | null
          speaker_bio?: string | null
          speaker_image?: string | null
          speaker_name?: string | null
          start_time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_schedule_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          college_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          event_type: string
          faqs: Json | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_hackathon: boolean | null
          location: string | null
          max_participants: number | null
          mode: Database["public"]["Enums"]["event_mode"] | null
          online_link: string | null
          prizes: Json | null
          registration_deadline: string | null
          registration_fee: number | null
          sponsors: Json | null
          start_date: string
          status: Database["public"]["Enums"]["event_status"] | null
          tags: string[] | null
          team_size_max: number | null
          team_size_min: number | null
          title: string
          updated_at: string
          venue_details: Json | null
          video_url: string | null
          waitlist_count: number | null
          waitlist_enabled: boolean | null
        }
        Insert: {
          college_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string
          faqs?: Json | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_hackathon?: boolean | null
          location?: string | null
          max_participants?: number | null
          mode?: Database["public"]["Enums"]["event_mode"] | null
          online_link?: string | null
          prizes?: Json | null
          registration_deadline?: string | null
          registration_fee?: number | null
          sponsors?: Json | null
          start_date: string
          status?: Database["public"]["Enums"]["event_status"] | null
          tags?: string[] | null
          team_size_max?: number | null
          team_size_min?: number | null
          title: string
          updated_at?: string
          venue_details?: Json | null
          video_url?: string | null
          waitlist_count?: number | null
          waitlist_enabled?: boolean | null
        }
        Update: {
          college_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string
          faqs?: Json | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_hackathon?: boolean | null
          location?: string | null
          max_participants?: number | null
          mode?: Database["public"]["Enums"]["event_mode"] | null
          online_link?: string | null
          prizes?: Json | null
          registration_deadline?: string | null
          registration_fee?: number | null
          sponsors?: Json | null
          start_date?: string
          status?: Database["public"]["Enums"]["event_status"] | null
          tags?: string[] | null
          team_size_max?: number | null
          team_size_min?: number | null
          title?: string
          updated_at?: string
          venue_details?: Json | null
          video_url?: string | null
          waitlist_count?: number | null
          waitlist_enabled?: boolean | null
        }
        Relationships: []
      }
      hackathon_registrations: {
        Row: {
          branch: string
          college_name: string
          email: string
          event_id: string
          full_name: string
          id: string
          phone: string | null
          registered_at: string
          roll_number: string
          status: string | null
          user_id: string
        }
        Insert: {
          branch: string
          college_name: string
          email: string
          event_id: string
          full_name: string
          id?: string
          phone?: string | null
          registered_at?: string
          roll_number: string
          status?: string | null
          user_id: string
        }
        Update: {
          branch?: string
          college_name?: string
          email?: string
          event_id?: string
          full_name?: string
          id?: string
          phone?: string | null
          registered_at?: string
          roll_number?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_scores: {
        Row: {
          feedback: string | null
          id: string
          judge_id: string
          rubric_id: string
          score: number
          scored_at: string | null
          submission_id: string
        }
        Insert: {
          feedback?: string | null
          id?: string
          judge_id: string
          rubric_id: string
          score: number
          scored_at?: string | null
          submission_id: string
        }
        Update: {
          feedback?: string | null
          id?: string
          judge_id?: string
          rubric_id?: string
          score?: number
          scored_at?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_scores_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "judging_rubrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_scores_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      judging_rubrics: {
        Row: {
          created_at: string | null
          criteria_name: string
          description: string | null
          event_id: string
          id: string
          max_score: number
          round: Database["public"]["Enums"]["hackathon_round"] | null
          sort_order: number | null
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          criteria_name: string
          description?: string | null
          event_id: string
          id?: string
          max_score?: number
          round?: Database["public"]["Enums"]["hackathon_round"] | null
          sort_order?: number | null
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          criteria_name?: string
          description?: string | null
          event_id?: string
          id?: string
          max_score?: number
          round?: Database["public"]["Enums"]["hackathon_round"] | null
          sort_order?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "judging_rubrics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          coupon_code: string | null
          created_at: string | null
          currency: string | null
          discount_amount: number | null
          event_id: string
          id: string
          invoice_number: string | null
          invoice_url: string | null
          metadata: Json | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          registration_id: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          coupon_code?: string | null
          created_at?: string | null
          currency?: string | null
          discount_amount?: number | null
          event_id: string
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          metadata?: Json | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          registration_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          coupon_code?: string | null
          created_at?: string | null
          currency?: string | null
          discount_amount?: number | null
          event_id?: string
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          metadata?: Json | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          registration_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          event_id: string | null
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["platform_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_roles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_statements: {
        Row: {
          category: string | null
          created_at: string | null
          description: string
          difficulty: string | null
          event_id: string
          id: string
          is_active: boolean | null
          max_teams: number | null
          resources: Json | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description: string
          difficulty?: string | null
          event_id: string
          id?: string
          is_active?: boolean | null
          max_teams?: number | null
          resources?: Json | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string
          difficulty?: string | null
          event_id?: string
          id?: string
          is_active?: boolean | null
          max_teams?: number | null
          resources?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "problem_statements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch: string | null
          college_id: string | null
          college_name: string | null
          created_at: string
          email: string
          full_name: string
          graduation_year: number | null
          id: string
          is_verified: boolean | null
          organization_name: string | null
          phone: string | null
          roll_number: string | null
          updated_at: string
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          avatar_url?: string | null
          branch?: string | null
          college_id?: string | null
          college_name?: string | null
          created_at?: string
          email: string
          full_name: string
          graduation_year?: number | null
          id?: string
          is_verified?: boolean | null
          organization_name?: string | null
          phone?: string | null
          roll_number?: string | null
          updated_at?: string
          user_id: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          avatar_url?: string | null
          branch?: string | null
          college_id?: string | null
          college_name?: string | null
          created_at?: string
          email?: string
          full_name?: string
          graduation_year?: number | null
          id?: string
          is_verified?: boolean | null
          organization_name?: string | null
          phone?: string | null
          roll_number?: string | null
          updated_at?: string
          user_id?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
      }
      registration_forms: {
        Row: {
          created_at: string | null
          event_id: string
          form_schema: Json
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          form_schema?: Json
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          form_schema?: Json
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_forms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          created_at: string | null
          demo_url: string | null
          description: string | null
          drive_link: string | null
          event_id: string
          file_urls: string[] | null
          github_url: string | null
          id: string
          round: Database["public"]["Enums"]["hackathon_round"]
          status: Database["public"]["Enums"]["submission_status"] | null
          submitted_at: string | null
          team_id: string
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          demo_url?: string | null
          description?: string | null
          drive_link?: string | null
          event_id: string
          file_urls?: string[] | null
          github_url?: string | null
          id?: string
          round: Database["public"]["Enums"]["hackathon_round"]
          status?: Database["public"]["Enums"]["submission_status"] | null
          submitted_at?: string | null
          team_id: string
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          demo_url?: string | null
          description?: string | null
          drive_link?: string | null
          event_id?: string
          file_urls?: string[] | null
          github_url?: string | null
          id?: string
          round?: Database["public"]["Enums"]["hackathon_round"]
          status?: Database["public"]["Enums"]["submission_status"] | null
          submitted_at?: string | null
          team_id?: string
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          invited_by: string
          invited_email: string
          status: Database["public"]["Enums"]["invite_status"] | null
          team_id: string
          token: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_by: string
          invited_email: string
          status?: Database["public"]["Enums"]["invite_status"] | null
          team_id: string
          token?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_by?: string
          invited_email?: string
          status?: Database["public"]["Enums"]["invite_status"] | null
          team_id?: string
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string | null
          role: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          role?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          role?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          current_round: Database["public"]["Enums"]["hackathon_round"] | null
          description: string | null
          event_id: string
          id: string
          invite_code: string | null
          leader_id: string
          mentor_id: string | null
          name: string
          problem_statement_id: string | null
          rank: number | null
          status: Database["public"]["Enums"]["team_status"] | null
          total_score: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_round?: Database["public"]["Enums"]["hackathon_round"] | null
          description?: string | null
          event_id: string
          id?: string
          invite_code?: string | null
          leader_id: string
          mentor_id?: string | null
          name: string
          problem_statement_id?: string | null
          rank?: number | null
          status?: Database["public"]["Enums"]["team_status"] | null
          total_score?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_round?: Database["public"]["Enums"]["hackathon_round"] | null
          description?: string | null
          event_id?: string
          id?: string
          invite_code?: string | null
          leader_id?: string
          mentor_id?: string | null
          name?: string
          problem_statement_id?: string | null
          rank?: number | null
          status?: Database["public"]["Enums"]["team_status"] | null
          total_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_problem_statement_fkey"
            columns: ["problem_statement_id"]
            isOneToOne: false
            referencedRelation: "problem_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          college_id: string | null
          id: string
          role: Database["public"]["Enums"]["college_role"]
          user_id: string
        }
        Insert: {
          college_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["college_role"]
          user_id: string
        }
        Update: {
          college_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["college_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_certificate_id: { Args: never; Returns: string }
      generate_invite_code: { Args: never; Returns: string }
      get_user_type: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_type"]
      }
      has_admin_college_role: { Args: { _user_id: string }; Returns: boolean }
      has_college_role: {
        Args: {
          _role: Database["public"]["Enums"]["college_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_platform_role: {
        Args: {
          _event_id?: string
          _role: Database["public"]["Enums"]["platform_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_event_organizer: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_team_leader: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      promote_to_admin: { Args: { _email: string }; Returns: undefined }
    }
    Enums: {
      certificate_type:
        | "participation"
        | "winner"
        | "runner_up"
        | "appreciation"
        | "volunteer"
        | "mentor"
        | "judge"
      college_role:
        | "principal"
        | "dean"
        | "staff_coordinator"
        | "student_coordinator"
      event_mode: "online" | "offline" | "hybrid"
      event_status:
        | "draft"
        | "published"
        | "ongoing"
        | "completed"
        | "cancelled"
      hackathon_round: "idea" | "prototype" | "semifinal" | "final"
      invite_status: "pending" | "accepted" | "declined" | "expired"
      payment_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "refunded"
      platform_role:
        | "super_admin"
        | "organizer"
        | "participant"
        | "judge"
        | "mentor"
        | "volunteer"
      registration_status:
        | "pending"
        | "confirmed"
        | "waitlisted"
        | "cancelled"
        | "attended"
      submission_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "evaluated"
        | "finalist"
      team_status:
        | "forming"
        | "complete"
        | "competing"
        | "disqualified"
        | "winner"
      user_type: "student" | "college" | "company" | "admin"
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
      certificate_type: [
        "participation",
        "winner",
        "runner_up",
        "appreciation",
        "volunteer",
        "mentor",
        "judge",
      ],
      college_role: [
        "principal",
        "dean",
        "staff_coordinator",
        "student_coordinator",
      ],
      event_mode: ["online", "offline", "hybrid"],
      event_status: ["draft", "published", "ongoing", "completed", "cancelled"],
      hackathon_round: ["idea", "prototype", "semifinal", "final"],
      invite_status: ["pending", "accepted", "declined", "expired"],
      payment_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "refunded",
      ],
      platform_role: [
        "super_admin",
        "organizer",
        "participant",
        "judge",
        "mentor",
        "volunteer",
      ],
      registration_status: [
        "pending",
        "confirmed",
        "waitlisted",
        "cancelled",
        "attended",
      ],
      submission_status: [
        "draft",
        "submitted",
        "under_review",
        "evaluated",
        "finalist",
      ],
      team_status: [
        "forming",
        "complete",
        "competing",
        "disqualified",
        "winner",
      ],
      user_type: ["student", "college", "company", "admin"],
    },
  },
} as const
