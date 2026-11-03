ALTER TABLE public.agenda_eventos ADD COLUMN IF NOT EXISTS outlook_id text;
CREATE UNIQUE INDEX IF NOT EXISTS agenda_eventos_user_outlook_key ON public.agenda_eventos (user_id, outlook_id) WHERE outlook_id IS NOT NULL;
COMMENT ON COLUMN public.agenda_eventos.outlook_id IS 'Identificador del evento en el calendario de Outlook; vacío en eventos solo de la app.';