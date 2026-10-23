CREATE TABLE public.configuracion_aplicacion (
 id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
 nombre text NOT NULL DEFAULT 'José Luis',
 apellidos text NOT NULL DEFAULT 'Martínez García',
 cargo text NOT NULL DEFAULT 'Inspector de Educación' CHECK (cargo IN ('Inspector de Educación','Inspectora de Educación','Inspector Jefe','Inspectora Jefa')),
 provincia text NOT NULL DEFAULT 'Albacete' CHECK (provincia IN ('Albacete','Ciudad Real','Cuenca','Guadalajara','Toledo')),
 correo_referencia text NOT NULL DEFAULT 'jlmgarcia@jccm.es',
 tema text NOT NULL DEFAULT 'institucional' CHECK (tema IN ('institucional','claro','oscuro','verde'))
);
GRANT SELECT, INSERT, UPDATE ON public.configuracion_aplicacion TO authenticated;
GRANT ALL ON public.configuracion_aplicacion TO service_role;
ALTER TABLE public.configuracion_aplicacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_select_configuracion ON public.configuracion_aplicacion FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_insert_configuracion ON public.configuracion_aplicacion FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY auth_update_configuracion ON public.configuracion_aplicacion FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.agenda_eventos ADD COLUMN cargo_visita text NOT NULL DEFAULT 'Inspector de Educación', ADD COLUMN provincia_visita text NOT NULL DEFAULT 'Albacete';