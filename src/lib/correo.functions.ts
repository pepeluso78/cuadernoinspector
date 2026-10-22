import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const importarCorreosFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { importarCorreos } = await import("@/lib/correo.server");
    try { return await importarCorreos(); }
    catch (e) { return { creados: 0, error: e instanceof Error ? e.message : "Error al leer el correo" }; }
  });
