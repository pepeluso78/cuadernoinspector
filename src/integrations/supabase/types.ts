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
      agenda_eventos: {
        Row: {
          centro_id: string | null
          created_at: string | null
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          notas_visita: string | null
          realizada: boolean | null
          tipo_evento: string
          titulo: string
          tramite_id: string | null
        }
        Insert: {
          centro_id?: string | null
          created_at?: string | null
          fecha_fin?: string | null
          fecha_inicio: string
          id?: string
          notas_visita?: string | null
          realizada?: boolean | null
          tipo_evento: string
          titulo: string
          tramite_id?: string | null
        }
        Update: {
          centro_id?: string | null
          created_at?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          notas_visita?: string | null
          realizada?: boolean | null
          tipo_evento?: string
          titulo?: string
          tramite_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_eventos_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_eventos_tramite_id_fkey"
            columns: ["tramite_id"]
            isOneToOne: true
            referencedRelation: "tramites"
            referencedColumns: ["id"]
          },
        ]
      }
      centros: {
        Row: {
          codigo_centro: string
          created_at: string | null
          director_email: string | null
          director_fecha_nombramiento: string | null
          director_nombre: string | null
          email_centro: string | null
          id: string
          jefe_estudios_email: string | null
          jefe_estudios_fecha_nombramiento: string | null
          jefe_estudios_nombre: string | null
          localidad: string | null
          nombre: string
          observaciones_generales: string | null
          secretario_email: string | null
          secretario_fecha_nombramiento: string | null
          secretario_nombre: string | null
          telefono: string | null
          tipo_centro: string | null
        }
        Insert: {
          codigo_centro: string
          created_at?: string | null
          director_email?: string | null
          director_fecha_nombramiento?: string | null
          director_nombre?: string | null
          email_centro?: string | null
          id?: string
          jefe_estudios_email?: string | null
          jefe_estudios_fecha_nombramiento?: string | null
          jefe_estudios_nombre?: string | null
          localidad?: string | null
          nombre: string
          observaciones_generales?: string | null
          secretario_email?: string | null
          secretario_fecha_nombramiento?: string | null
          secretario_nombre?: string | null
          telefono?: string | null
          tipo_centro?: string | null
        }
        Update: {
          codigo_centro?: string
          created_at?: string | null
          director_email?: string | null
          director_fecha_nombramiento?: string | null
          director_nombre?: string | null
          email_centro?: string | null
          id?: string
          jefe_estudios_email?: string | null
          jefe_estudios_fecha_nombramiento?: string | null
          jefe_estudios_nombre?: string | null
          localidad?: string | null
          nombre?: string
          observaciones_generales?: string | null
          secretario_email?: string | null
          secretario_fecha_nombramiento?: string | null
          secretario_nombre?: string | null
          telefono?: string | null
          tipo_centro?: string | null
        }
        Relationships: []
      }
      checklists_centro: {
        Row: {
          categoria: string
          centro_id: string | null
          curso_escolar: string
          estado_global: string | null
          fecha_supervision: string | null
          id: string
          items_verificacion: Json | null
          observaciones_inspector: string | null
          requerimiento_generado: string | null
          updated_at: string | null
        }
        Insert: {
          categoria: string
          centro_id?: string | null
          curso_escolar?: string
          estado_global?: string | null
          fecha_supervision?: string | null
          id?: string
          items_verificacion?: Json | null
          observaciones_inspector?: string | null
          requerimiento_generado?: string | null
          updated_at?: string | null
        }
        Update: {
          categoria?: string
          centro_id?: string | null
          curso_escolar?: string
          estado_global?: string | null
          fecha_supervision?: string | null
          id?: string
          items_verificacion?: Json | null
          observaciones_inspector?: string | null
          requerimiento_generado?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklists_centro_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centros"
            referencedColumns: ["id"]
          },
        ]
      }
      normativa_clm: {
        Row: {
          bloque_tematico: string
          cita_informes: string | null
          etapa_educativa: string | null
          id: string
          notas_inspector: string | null
          rango_normativo: string
          titulo_norma: string
          url_enlace: string
        }
        Insert: {
          bloque_tematico: string
          cita_informes?: string | null
          etapa_educativa?: string | null
          id?: string
          notas_inspector?: string | null
          rango_normativo: string
          titulo_norma: string
          url_enlace: string
        }
        Update: {
          bloque_tematico?: string
          cita_informes?: string | null
          etapa_educativa?: string | null
          id?: string
          notas_inspector?: string | null
          rango_normativo?: string
          titulo_norma?: string
          url_enlace?: string
        }
        Relationships: []
      }
      notas_centro: {
        Row: {
          categoria: string
          centro_id: string | null
          contenido: string | null
          fecha_registro: string | null
          id: string
          importante: boolean | null
          titulo: string
        }
        Insert: {
          categoria: string
          centro_id?: string | null
          contenido?: string | null
          fecha_registro?: string | null
          id?: string
          importante?: boolean | null
          titulo: string
        }
        Update: {
          categoria?: string
          centro_id?: string | null
          contenido?: string | null
          fecha_registro?: string | null
          id?: string
          importante?: boolean | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notas_centro_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centros"
            referencedColumns: ["id"]
          },
        ]
      }
      tramites: {
        Row: {
          asunto: string
          borrador_informe: string | null
          centro_id: string | null
          created_at: string | null
          descripcion_entrada: string | null
          estado: string | null
          fecha_entrada: string | null
          fecha_limite: string | null
          id: string
          numero_registro: string | null
          origen: string
          plazo_dias: number | null
          prioridad: string | null
          remitente: string | null
          tipo_actuacion: string | null
        }
        Insert: {
          asunto: string
          borrador_informe?: string | null
          centro_id?: string | null
          created_at?: string | null
          descripcion_entrada?: string | null
          estado?: string | null
          fecha_entrada?: string | null
          fecha_limite?: string | null
          id?: string
          numero_registro?: string | null
          origen: string
          plazo_dias?: number | null
          prioridad?: string | null
          remitente?: string | null
          tipo_actuacion?: string | null
        }
        Update: {
          asunto?: string
          borrador_informe?: string | null
          centro_id?: string | null
          created_at?: string | null
          descripcion_entrada?: string | null
          estado?: string | null
          fecha_entrada?: string | null
          fecha_limite?: string | null
          id?: string
          numero_registro?: string | null
          origen?: string
          plazo_dias?: number | null
          prioridad?: string | null
          remitente?: string | null
          tipo_actuacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tramites_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centros"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
