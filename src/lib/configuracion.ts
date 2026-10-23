import { queryOptions, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const CARGOS = ["Inspector de Educación", "Inspectora de Educación", "Inspector Jefe", "Inspectora Jefa"] as const;
export const PROVINCIAS = ["Albacete", "Ciudad Real", "Cuenca", "Guadalajara", "Toledo"] as const;
export const TEMAS = ["institucional", "claro", "oscuro", "verde"] as const;
export const configuracionSchema = z.object({ user_id: z.string().min(1), nombre: z.string().trim().min(1), apellidos: z.string().trim().min(1), cargo: z.enum(CARGOS), provincia: z.enum(PROVINCIAS), correo_referencia: z.string().trim().email().transform((v) => v.toLowerCase()), tema: z.enum(TEMAS) });
export type Configuracion = z.infer<typeof configuracionSchema>;
/** Datos en blanco para un usuario recién registrado: los completa la primera vez que entra. */
export const CONFIG_INICIAL: Configuracion = { user_id: "", nombre: "", apellidos: "", cargo: "Inspector de Educación", provincia: "Albacete", correo_referencia: "", tema: "institucional" };
export const nombreInspector = (c: Configuracion) => `${c.nombre} ${c.apellidos}`.trim();
export const servicioProvincial = (provincia: string) => `Delegación Provincial de Educación, Cultura y Deportes de ${provincia}`;
export { busquedaCorreo } from "./correo-filtro";
export const configuracionQuery = queryOptions({ queryKey: ["configuracion"], queryFn: async (): Promise<Configuracion> => {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return CONFIG_INICIAL;
  const { data, error } = await supabase.from("configuracion_aplicacion").select("*").eq("user_id", uid).maybeSingle();
  if (error) throw error;
  return data ? configuracionSchema.parse(data) : { ...CONFIG_INICIAL, user_id: uid };
} });
export function useConfiguracion() { return useQuery(configuracionQuery).data ?? CONFIG_INICIAL; }
