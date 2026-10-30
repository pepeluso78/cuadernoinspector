import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { ordenarCentros } from "@/lib/orden-centros";

const MINUTO = 60_000;
const HORA = 60 * MINUTO;

export type Centro = Database["public"]["Tables"]["centros"]["Row"];
export type Tramite = Database["public"]["Tables"]["tramites"]["Row"];
export type Nota = Database["public"]["Tables"]["notas_centro"]["Row"];
export type Evento = Database["public"]["Tables"]["agenda_eventos"]["Row"];
export type Norma = Database["public"]["Tables"]["normativa_clm"]["Row"];
export type Checklist = Database["public"]["Tables"]["checklists_centro"]["Row"];

function ok<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export const centrosQuery = queryOptions({
  queryKey: ["centros"],
  staleTime: 30 * MINUTO,
  queryFn: async () =>
    ordenarCentros(ok(await supabase.from("centros").select("*").order("nombre"))),
});
export const centroQuery = (id: string) =>
  queryOptions({
    queryKey: ["centros", id],
    staleTime: 30 * MINUTO,
    queryFn: async () => ok(await supabase.from("centros").select("*").eq("id", id).single()),
  });
export const tramitesQuery = queryOptions({
  queryKey: ["tramites"],
  staleTime: 2 * MINUTO,
  queryFn: async () => {
    const tramites: Tramite[] = [];
    const pagina = 500;
    for (let desde = 0; ; desde += pagina) {
      const filas = ok(await supabase.from("tramites").select("*").order("fecha_limite").order("id").range(desde, desde + pagina - 1));
      tramites.push(...filas);
      if (filas.length < pagina) return tramites;
    }
  },
});
export const notasQuery = (centroId: string) =>
  queryOptions({
    queryKey: ["notas", centroId],
    staleTime: 5 * MINUTO,
    queryFn: async () =>
      ok(await supabase.from("notas_centro").select("*").eq("centro_id", centroId).order("fecha_registro", { ascending: false })),
  });
export const eventosQuery = queryOptions({
  queryKey: ["eventos"],
  staleTime: 5 * MINUTO,
  queryFn: async () => ok(await supabase.from("agenda_eventos").select("*").order("fecha_inicio")),
});
// La clave empieza por ["eventos"], así que las mutaciones que ya invalidan ["eventos"] refrescan esta lista.
export const visitasCentroQuery = (centroId: string) =>
  queryOptions({
    queryKey: ["eventos", centroId, "visitas"],
    staleTime: 5 * MINUTO,
    queryFn: async () =>
      ok(await supabase
        .from("agenda_eventos")
        .select("*")
        .eq("centro_id", centroId)
        .eq("tipo_evento", "Visita a Centro")
        .order("fecha_inicio", { ascending: false })),
  });
export const normativaQuery = queryOptions({
  queryKey: ["normativa"],
  staleTime: 12 * HORA,
  queryFn: async () => ok(await supabase.from("normativa_clm").select("*").order("titulo_norma")),
});
export const checklistsQuery = (centroId: string) =>
  queryOptions({
    queryKey: ["checklists", centroId],
    staleTime: 5 * MINUTO,
    queryFn: async () => ok(await supabase.from("checklists_centro").select("*").eq("centro_id", centroId)),
  });
export const allChecklistsQuery = queryOptions({
  queryKey: ["checklists"],
  staleTime: 5 * MINUTO,
  queryFn: async () => ok(await supabase.from("checklists_centro").select("*")),
});
export type ParteAusencias = Database["public"]["Tables"]["partes_ausencias"]["Row"];
export const partesQuery = (curso: string) =>
  queryOptions({
    queryKey: ["partes", curso],
    staleTime: 5 * MINUTO,
    queryFn: async () => ok(await supabase.from("partes_ausencias").select("*").eq("curso_escolar", curso)),
  });
export type Guardia = Database["public"]["Tables"]["guardias"]["Row"];
export const guardiasQuery = queryOptions({
  queryKey: ["guardias"],
  staleTime: 5 * MINUTO,
  queryFn: async () => ok(await supabase.from("guardias").select("*").order("fecha", { ascending: false })),
});
