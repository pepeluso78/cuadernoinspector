CREATE TABLE public.guardias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  persona_nombre text NOT NULL DEFAULT '',
  persona_condicion text NOT NULL DEFAULT '',
  persona_contacto text NOT NULL DEFAULT '',
  modalidad text NOT NULL DEFAULT 'Teléfono',
  inspector_guardia text NOT NULL DEFAULT '',
  cargo_guardia text NOT NULL DEFAULT 'Inspector de Educación',
  provincia_guardia text NOT NULL DEFAULT 'Albacete',
  inspector_centro text NOT NULL DEFAULT '',
  centro_id uuid REFERENCES public.centros(id) ON DELETE SET NULL,
  centro_texto text NOT NULL DEFAULT '',
  incidencia text NOT NULL DEFAULT '',
  respuesta text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guardias TO authenticated;
GRANT ALL ON public.guardias TO service_role;
ALTER TABLE public.guardias ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_select_guardias ON public.guardias FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_insert_guardias ON public.guardias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY auth_update_guardias ON public.guardias FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_delete_guardias ON public.guardias FOR DELETE TO authenticated USING (true);