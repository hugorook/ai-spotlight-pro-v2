export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          company_name: string
          website_url: string
          industry: string
          description: string
          target_customers: string
          key_differentiators: string
          geographic_focus: string[]
          competitors: string[]
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          company_name: string
          website_url: string
          industry: string
          description: string
          target_customers: string
          key_differentiators: string
          geographic_focus: string[]
          competitors: string[]
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          company_name?: string
          website_url?: string
          industry?: string
          description?: string
          target_customers?: string
          key_differentiators?: string
          geographic_focus?: string[]
          competitors?: string[]
        }
      }
      ai_tests: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          company_id: string
          prompt_id: string | null
          prompt_text: string | null
          ai_model: string
          company_mentioned: boolean
          mention_position: number | null
          sentiment: 'positive' | 'neutral' | 'negative' | null
          mention_context: string | null
          competitors_mentioned: string[]
          response_text: string
          test_date: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          company_id: string
          prompt_id?: string | null
          prompt_text?: string | null
          ai_model: string
          company_mentioned: boolean
          mention_position?: number | null
          sentiment?: 'positive' | 'neutral' | 'negative' | null
          mention_context?: string | null
          competitors_mentioned?: string[]
          response_text: string
          test_date?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          company_id?: string
          prompt_id?: string | null
          prompt_text?: string | null
          ai_model?: string
          company_mentioned?: boolean
          mention_position?: number | null
          sentiment?: 'positive' | 'neutral' | 'negative' | null
          mention_context?: string | null
          competitors_mentioned?: string[]
          response_text?: string
          test_date?: string
        }
      }
      users: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          email: string
          full_name: string | null
          avatar_url: string | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      'test-ai-models': {
        Args: {
          company_id: string
          prompts: string[]
        }
        Returns: {
          prompt: string
          mentioned: boolean
          position: number
          sentiment: string
          context: string
          ai_model: string
        }[]
      }
      'analyze-mentions': {
        Args: {
          company_id: string
          start_date?: string
          end_date?: string
        }
        Returns: {
          total_tests: number
          mention_rate: number
          avg_position: number
          sentiment_breakdown: Json
        }
      }
      'generate-content': {
        Args: {
          company_id: string
          content_type: string
          topic: string
        }
        Returns: {
          title: string
          content: string
          outline: string[]
        }
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTaskNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never