ALTER TABLE public.trabajo_distancia ADD COLUMN dia_guardia smallint CHECK (dia_guardia BETWEEN 1 AND 5);
CREATE TABLE public.guardia_semanas (user_id uuid NOT NULL DEFAULT auth.uid(), semana date NOT NULL, fecha date, PRIMARY KEY (user_id, semana));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guardia_semanas TO authenticated;
GRANT ALL ON public.guardia_semanas TO service_role;
ALTER TABLE public.guardia_semanas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own row" ON public.guardia_semanas FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
COMMENT ON TABLE public.guardia_semanas IS 'Cambio semanal del día de guardia: fecha NULL = sin guardia esa semana';