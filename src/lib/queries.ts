import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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
  queryFn: async () => ok(await supabase.from("centros").select("*").order("nombre")),
});
export const centroQuery = (id: string) =>
  queryOptions({
    queryKey: ["centros", id],
    queryFn: async () => ok(await supabase.from("centros").select("*").eq("id", id).single()),
  });
export const tramitesQuery = queryOptions({
  queryKey: ["tramites"],
  queryFn: async () => ok(await supabase.from("tramites").select("*").order("fecha_limite")),
});
export const notasQuery = (centroId: string) =>
  queryOptions({
    queryKey: ["notas", centroId],
    queryFn: async () =>
      ok(await supabase.from("notas_centro").select("*").eq("centro_id", centroId).order("fecha_registro", { ascending: false })),
  });
export const eventosQuery = queryOptions({
  queryKey: ["eventos"],
  queryFn: async () => ok(await supabase.from("agenda_eventos").select("*").order("fecha_inicio")),
});
export const normativaQuery = queryOptions({
  queryKey: ["normativa"],
  queryFn: async () => ok(await supabase.from("normativa_clm").select("*").order("titulo_norma")),
});
export const checklistsQuery = (centroId: string) =>
  queryOptions({
    queryKey: ["checklists", centroId],
    queryFn: async () => ok(await supabase.from("checklists_centro").select("*").eq("centro_id", centroId)),
  });
export const allChecklistsQuery = queryOptions({
  queryKey: ["checklists"],
  queryFn: async () => ok(await supabase.from("checklists_centro").select("*")),
});
