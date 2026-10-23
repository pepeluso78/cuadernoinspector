import { queryOptions, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const CARGOS = ["Inspector de Educación", "Inspectora de Educación", "Inspector Jefe", "Inspectora Jefa"] as const;
export const PROVINCIAS = ["Albacete", "Ciudad Real", "Cuenca", "Guadalajara", "Toledo"] as const;
export const TEMAS = ["institucional", "claro", "oscuro", "verde"] as const;
export const configuracionSchema = z.object({ id: z.literal(1), nombre: z.string().trim().min(1), apellidos: z.string().trim().min(1), cargo: z.enum(CARGOS), provincia: z.enum(PROVINCIAS), correo_referencia: z.string().trim().email().transform((v) => v.toLowerCase()), tema: z.enum(TEMAS) });
export type Configuracion = z.infer<typeof configuracionSchema>;
export const CONFIG_INICIAL: Configuracion = { id: 1, nombre: "José Luis", apellidos: "Martínez García", cargo: "Inspector de Educación", provincia: "Albacete", correo_referencia: "jlmgarcia@jccm.es", tema: "institucional" };
export const nombreInspector = (c: Configuracion) => `${c.nombre} ${c.apellidos}`.trim();
export const servicioProvincial = (provincia: string) => `Delegación Provincial de Educación, Cultura y Deportes de ${provincia}`;
export { busquedaCorreo } from "./correo-filtro";
export const configuracionQuery = queryOptions({ queryKey: ["configuracion"], queryFn: async () => {
  const { data, error } = await supabase.from("configuracion_aplicacion").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data ? configuracionSchema.parse(data) : CONFIG_INICIAL;
} });
export function useConfiguracion() { return useQuery(configuracionQuery).data ?? CONFIG_INICIAL; }