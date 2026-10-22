import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const importarCorreosFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { importarCorreos } = await import("@/lib/correo.server");
    try { return await importarCorreos(context.supabase); }
    catch (e) { return { creados: 0, adjuntos: 0, errores: [] as string[], error: e instanceof Error ? e.message : "Error al leer el correo" }; }
  });
