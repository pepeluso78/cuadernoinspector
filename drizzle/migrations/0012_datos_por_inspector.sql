DO $$
DECLARE jl uuid := (SELECT id FROM auth.users WHERE lower(email) = 'jlmgarcia@jccm.es' LIMIT 1);
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tramites','agenda_eventos','checklists_centro','documentos_tramite','guardias','notas_centro','partes_ausencias'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid()', t);
  END LOOP;
  UPDATE public.tramites x SET user_id = COALESCE((SELECT c.user_id FROM public.centros c WHERE c.id = x.centro_id), jl) WHERE user_id IS NULL;
  UPDATE public.documentos_tramite x SET user_id = (SELECT tr.user_id FROM public.tramites tr WHERE tr.id = x.tramite_id) WHERE user_id IS NULL;
  UPDATE public.agenda_eventos x SET user_id = COALESCE((SELECT tr.user_id FROM public.tramites tr WHERE tr.id = x.tramite_id), (SELECT c.user_id FROM public.centros c WHERE c.id = x.centro_id), jl) WHERE user_id IS NULL;
  UPDATE public.checklists_centro x SET user_id = COALESCE((SELECT c.user_id FROM public.centros c WHERE c.id = x.centro_id), jl) WHERE user_id IS NULL;
  UPDATE public.notas_centro x SET user_id = COALESCE((SELECT c.user_id FROM public.centros c WHERE c.id = x.centro_id), jl) WHERE user_id IS NULL;
  UPDATE public.partes_ausencias x SET user_id = COALESCE((SELECT c.user_id FROM public.centros c WHERE c.id = x.centro_id), jl) WHERE user_id IS NULL;
  UPDATE public.guardias x SET user_id = COALESCE((SELECT c.user_id FROM public.centros c WHERE c.id = x.centro_id), jl) WHERE user_id IS NULL;
  FOREACH t IN ARRAY ARRAY['tramites','agenda_eventos','checklists_centro','documentos_tramite','guardias','notas_centro','partes_ausencias'] LOOP
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(user_id)', t || '_user_id_idx', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth_select_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth_insert_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth_update_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth_delete_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (user_id = auth.uid())', t || '_select_propios', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())', t || '_insert_propios', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', t || '_update_propios', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (user_id = auth.uid())', t || '_delete_propios', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.sync_vencimiento_tramite()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.agenda_eventos (titulo, tipo_evento, centro_id, tramite_id, fecha_inicio, realizada, user_id)
  VALUES ('Vence: ' || NEW.asunto, 'Vencimiento Trámite', NEW.centro_id, NEW.id,
          (NEW.fecha_limite::timestamp + time '09:00') AT TIME ZONE 'Europe/Madrid',
          NEW.estado IN ('Respondido / Elevado', 'Finalizado'), NEW.user_id)
  ON CONFLICT (tramite_id) DO UPDATE SET titulo = EXCLUDED.titulo, centro_id = EXCLUDED.centro_id,
    fecha_inicio = EXCLUDED.fecha_inicio, realizada = EXCLUDED.realizada, user_id = EXCLUDED.user_id;
  RETURN NEW;
END $$;

DROP POLICY IF EXISTS auth_select_tramites_archivos ON storage.objects;
DROP POLICY IF EXISTS auth_insert_tramites_archivos ON storage.objects;
DROP POLICY IF EXISTS auth_delete_tramites_archivos ON storage.objects;
CREATE POLICY tramites_archivos_select_propios ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'tramites-documentos' AND EXISTS (SELECT 1 FROM public.tramites WHERE id::text = (storage.foldername(name))[1] AND user_id = auth.uid()));
CREATE POLICY tramites_archivos_insert_propios ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'tramites-documentos' AND EXISTS (SELECT 1 FROM public.tramites WHERE id::text = (storage.foldername(name))[1] AND user_id = auth.uid()));
CREATE POLICY tramites_archivos_delete_propios ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'tramites-documentos' AND EXISTS (SELECT 1 FROM public.tramites WHERE id::text = (storage.foldername(name))[1] AND user_id = auth.uid()));