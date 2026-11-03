import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  cuerpoEventoOutlook,
  esEventoCancelado,
  filaDesdeEventoOutlook,
  type FilaAgendaDesdeOutlook,
} from "./outlook-mapping";

const LIMITE_ENVIOS = 50;

/**
 * Enlace de dos direcciones entre la Agenda y el calendario de Outlook:
 * trae los compromisos de Outlook que faltan y lleva a Outlook los eventos
 * de la app que todavía no están, siempre dentro del rango indicado.
 */
export const sincronizarOutlook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((entrada: { desde: string; hasta: string }) => ({ desde: entrada.desde, hasta: entrada.hasta }))
  .handler(async ({ data, context }) => {
    const desde = new Date(data.desde);
    const hasta = new Date(data.hasta);
    if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime()) || hasta <= desde) {
      throw new Error("El rango de fechas no es válido");
    }
    const desdeISO = desde.toISOString();
    const hastaISO = hasta.toISOString();
    const { supabase, userId } = context;
    const { listarEventosOutlook, crearEventoOutlook } = await import("./outlook.server");

    const { data: actuales, error: errorLista } = await supabase
      .from("agenda_eventos")
      .select("id, titulo, tipo_evento, tramite_id, fecha_inicio, fecha_fin, notas_visita, outlook_id")
      .eq("user_id", userId);
    if (errorLista) throw new Error(errorLista.message);

    const enRango = (iso: string) => iso >= desdeISO && iso <= hastaISO;
    const yaTraidos = new Set((actuales ?? []).map((e) => e.outlook_id).filter(Boolean) as string[]);

    // 1) De Outlook a la Agenda: solo los compromisos que aún no están.
    const compromisos = await listarEventosOutlook(desde, hasta);
    const nuevas = compromisos
      .filter((ev) => !esEventoCancelado(ev) && !yaTraidos.has(ev.id))
      .map(filaDesdeEventoOutlook)
      .filter((f): f is FilaAgendaDesdeOutlook => !!f && enRango(f.fecha_inicio));
    if (nuevas.length) {
      const { error } = await supabase.from("agenda_eventos").insert(nuevas);
      if (error) throw new Error(error.message);
    }

    // 2) De la Agenda a Outlook: eventos propios sin compromiso asociado.
    const pendientes = (actuales ?? [])
      .filter((e) => !e.outlook_id && !e.tramite_id && enRango(e.fecha_inicio) && e.titulo.trim())
      .slice(0, LIMITE_ENVIOS);
    let enviados = 0;
    for (const e of pendientes) {
      const creado = await crearEventoOutlook(cuerpoEventoOutlook(e));
      if (!creado?.id) continue;
      const { error } = await supabase.from("agenda_eventos").update({ outlook_id: creado.id }).eq("id", e.id);
      if (error) throw new Error(error.message);
      enviados++;
    }

    return { traidos: nuevas.length, enviados, vistos: compromisos.length };
  });
