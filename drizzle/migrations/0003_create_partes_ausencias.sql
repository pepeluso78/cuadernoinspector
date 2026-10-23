CREATE TABLE public.partes_ausencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES public.centros(id) ON DELETE CASCADE,
  curso_escolar TEXT NOT NULL DEFAULT '2026/2027',
  mes TEXT NOT NULL,
  presentado BOOLEAN NOT NULL DEFAULT false,
  fecha_presentacion DATE,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (centro_id, curso_escolar, mes)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partes_ausencias TO authenticated;
GRANT ALL ON public.partes_ausencias TO service_role;

ALTER TABLE public.partes_ausencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_select_partes_ausencias ON public.partes_ausencias FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_insert_partes_ausencias ON public.partes_ausencias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY auth_update_partes_ausencias ON public.partes_ausencias FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_delete_partes_ausencias ON public.partes_ausencias FOR DELETE TO authenticated USING (true);