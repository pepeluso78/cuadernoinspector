CREATE OR REPLACE FUNCTION public.sync_vencimiento_tramite()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.agenda_eventos (titulo, tipo_evento, centro_id, tramite_id, fecha_inicio, realizada)
  VALUES ('Vence: ' || NEW.asunto, 'Vencimiento Trámite', NEW.centro_id, NEW.id,
          (NEW.fecha_limite::timestamp + time '09:00') AT TIME ZONE 'Europe/Madrid',
          NEW.estado IN ('Respondido / Elevado', 'Finalizado'))
  ON CONFLICT (tramite_id) DO UPDATE SET titulo = EXCLUDED.titulo, centro_id = EXCLUDED.centro_id,
    fecha_inicio = EXCLUDED.fecha_inicio, realizada = EXCLUDED.realizada;
  RETURN NEW;
END $$;

UPDATE public.agenda_eventos e
SET realizada = true
FROM public.tramites t
WHERE e.tramite_id = t.id AND t.estado = 'Finalizado' AND e.realizada IS NOT TRUE;