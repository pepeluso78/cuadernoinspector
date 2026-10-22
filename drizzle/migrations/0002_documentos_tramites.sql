CREATE TABLE public.documentos_tramite (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tramite_id uuid NOT NULL REFERENCES public.tramites(id) ON DELETE CASCADE,
 nombre text NOT NULL,
 ruta text NOT NULL UNIQUE,
 mime_type text NOT NULL DEFAULT 'application/octet-stream',
 tamano bigint NOT NULL CHECK (tamano >= 0),
 categoria text NOT NULL DEFAULT 'Otros documentos' CHECK (categoria IN ('Correo', 'Alegaciones', 'Informe', 'Otros documentos')),
 correo_parte_id text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (tramite_id, correo_parte_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos_tramite TO authenticated;
GRANT ALL ON public.documentos_tramite TO service_role;
ALTER TABLE public.documentos_tramite ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_select_documentos_tramite ON public.documentos_tramite FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_insert_documentos_tramite ON public.documentos_tramite FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY auth_update_documentos_tramite ON public.documentos_tramite FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_delete_documentos_tramite ON public.documentos_tramite FOR DELETE TO authenticated USING (true);
CREATE POLICY auth_select_tramites_archivos ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'tramites-documentos');
CREATE POLICY auth_insert_tramites_archivos ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'tramites-documentos' AND EXISTS (SELECT 1 FROM public.tramites WHERE id::text = (storage.foldername(name))[1]));
CREATE POLICY auth_delete_tramites_archivos ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'tramites-documentos');