ALTER TABLE public.configuracion_aplicacion DROP CONSTRAINT IF EXISTS configuracion_aplicacion_id_check;
CREATE SEQUENCE IF NOT EXISTS public.configuracion_aplicacion_id_seq OWNED BY public.configuracion_aplicacion.id;
SELECT setval('public.configuracion_aplicacion_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM public.configuracion_aplicacion), 1));
ALTER TABLE public.configuracion_aplicacion ALTER COLUMN id SET DEFAULT nextval('public.configuracion_aplicacion_id_seq');
GRANT USAGE, SELECT ON SEQUENCE public.configuracion_aplicacion_id_seq TO authenticated, service_role;