ALTER TABLE public.configuracion_aplicacion ADD COLUMN user_id uuid;

UPDATE public.configuracion_aplicacion SET user_id = 'ead4f9bc-d6ed-466c-8dff-08ac0a73c54f' WHERE id = 1;

ALTER TABLE public.configuracion_aplicacion ALTER COLUMN nombre SET DEFAULT '';
ALTER TABLE public.configuracion_aplicacion ALTER COLUMN apellidos SET DEFAULT '';
ALTER TABLE public.configuracion_aplicacion ALTER COLUMN correo_referencia SET DEFAULT '';

CREATE UNIQUE INDEX configuracion_aplicacion_user_id_key ON public.configuracion_aplicacion (user_id);

DROP POLICY auth_insert_configuracion ON public.configuracion_aplicacion;
DROP POLICY auth_select_configuracion ON public.configuracion_aplicacion;
DROP POLICY auth_update_configuracion ON public.configuracion_aplicacion;

CREATE POLICY auth_select_configuracion ON public.configuracion_aplicacion FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY auth_insert_configuracion ON public.configuracion_aplicacion FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY auth_update_configuracion ON public.configuracion_aplicacion FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMENT ON COLUMN public.configuracion_aplicacion.id IS 'DEPRECATED: la configuración es por usuario; la clave real es user_id';