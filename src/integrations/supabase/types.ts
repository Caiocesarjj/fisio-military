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
      audit_logs: {
        Row: {
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          operacao: string
          registro_id: string | null
          tabela_afetada: string
          usuario_id: string | null
          usuario_nome: string | null
        }
        Insert: {
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          operacao: string
          registro_id?: string | null
          tabela_afetada: string
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Update: {
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          operacao?: string
          registro_id?: string | null
          tabela_afetada?: string
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          categoria: string
          created_at: string
          descricao: string | null
          dificuldade: string
          id: string
          imagem_url: string | null
          instrucoes: string | null
          nome: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          categoria: string
          created_at?: string
          descricao?: string | null
          dificuldade?: string
          id?: string
          imagem_url?: string | null
          instrucoes?: string | null
          nome: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string
          descricao?: string | null
          dificuldade?: string
          id?: string
          imagem_url?: string | null
          instrucoes?: string | null
          nome?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      militares: {
        Row: {
          ativo: boolean
          companhia: string
          created_at: string
          data_alta: string | null
          diagnostico: string | null
          email: string
          foto_url: string | null
          id: string
          lesoes: Json | null
          motivo_alta: string | null
          nip: string
          nome_completo: string
          nome_guerra: string
          observacoes: string | null
          observacoes_alta: string | null
          posto_graduacao: string
          profile_id: string | null
          setor: string | null
          status_militar: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          companhia: string
          created_at?: string
          data_alta?: string | null
          diagnostico?: string | null
          email: string
          foto_url?: string | null
          id?: string
          lesoes?: Json | null
          motivo_alta?: string | null
          nip: string
          nome_completo: string
          nome_guerra: string
          observacoes?: string | null
          observacoes_alta?: string | null
          posto_graduacao: string
          profile_id?: string | null
          setor?: string | null
          status_militar?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          companhia?: string
          created_at?: string
          data_alta?: string | null
          diagnostico?: string | null
          email?: string
          foto_url?: string | null
          id?: string
          lesoes?: Json | null
          motivo_alta?: string | null
          nip?: string
          nome_completo?: string
          nome_guerra?: string
          observacoes?: string | null
          observacoes_alta?: string | null
          posto_graduacao?: string
          profile_id?: string | null
          setor?: string | null
          status_militar?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "militares_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_exercises: {
        Row: {
          created_at: string
          descanso: string | null
          exercise_id: string
          frequencia_semanal: number | null
          id: string
          observacoes: string | null
          plan_id: string
          repeticoes: number | null
          series: number | null
        }
        Insert: {
          created_at?: string
          descanso?: string | null
          exercise_id: string
          frequencia_semanal?: number | null
          id?: string
          observacoes?: string | null
          plan_id: string
          repeticoes?: number | null
          series?: number | null
        }
        Update: {
          created_at?: string
          descanso?: string | null
          exercise_id?: string
          frequencia_semanal?: number | null
          id?: string
          observacoes?: string | null
          plan_id?: string
          repeticoes?: number | null
          series?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_exercises_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
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
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_notes: {
        Row: {
          created_at: string
          id: string
          militar_id: string
          nivel_dor: number | null
          observacoes_paciente: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          militar_id: string
          nivel_dor?: number | null
          observacoes_paciente?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          militar_id?: string
          nivel_dor?: number | null
          observacoes_paciente?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_militar_id_fkey"
            columns: ["militar_id"]
            isOneToOne: false
            referencedRelation: "militares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          anotacao_clinica: string | null
          created_at: string
          data_hora: string
          duracao: number
          fisio_id: string
          id: string
          militar_id: string
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          anotacao_clinica?: string | null
          created_at?: string
          data_hora: string
          duracao?: number
          fisio_id: string
          id?: string
          militar_id: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          anotacao_clinica?: string | null
          created_at?: string
          data_hora?: string
          duracao?: number
          fisio_id?: string
          id?: string
          militar_id?: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_militar_id_fkey"
            columns: ["militar_id"]
            isOneToOne: false
            referencedRelation: "militares"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          ativo: boolean
          created_at: string
          data_fim: string | null
          data_inicio: string
          fisio_id: string
          id: string
          militar_id: string
          nome: string
          objetivo: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          fisio_id: string
          id?: string
          militar_id: string
          nome: string
          objetivo?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          fisio_id?: string
          id?: string
          militar_id?: string
          nome?: string
          objetivo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_militar_id_fkey"
            columns: ["militar_id"]
            isOneToOne: false
            referencedRelation: "militares"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      app_role: "admin" | "military"
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
      app_role: ["admin", "military"],
    },
  },
} as const
