CREATE TABLE public.trabajo_distancia (user_id uuid PRIMARY KEY DEFAULT auth.uid(), dia_semana smallint CHECK (dia_semana BETWEEN 1 AND 5), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trabajo_distancia TO authenticated;
GRANT ALL ON public.trabajo_distancia TO service_role;
ALTER TABLE public.trabajo_distancia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own row" ON public.trabajo_distancia FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);