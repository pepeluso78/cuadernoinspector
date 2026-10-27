import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ORIGENES = /^(https:\/\/([a-z0-9-]+\.)*lovable\.app|http:\/\/localhost(:\d+)?)$/;
const entrada = z.object({ email: z.string().trim().email().max(255), origen: z.string().regex(ORIGENES) });

const b64 = (s: string) => btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
const cabecera = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);

/** Envía el enlace de recuperación al correo alternativo configurado por el titular, si existe. */
export const solicitarRecuperacionFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => entrada.parse(d))
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase();
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: `${data.origen}/reset-password` } });
      if (error || !link.user) return { enviadoAlternativo: false };
      const { data: cfg } = await supabaseAdmin.from("configuracion_aplicacion").select("correo_recuperacion").eq("user_id", link.user.id).maybeSingle();
      const destino = cfg?.correo_recuperacion?.trim().toLowerCase();
      if (!destino || destino === email) return { enviadoAlternativo: false };
      const lk = process.env["LOVABLE_API_KEY"], gk = process.env["GOOGLE_MAIL_API_KEY"];
      if (!lk || !gk) return { enviadoAlternativo: false };
      const cuerpo = `Se ha solicitado restablecer la contraseña de la cuenta ${email} en el Cuaderno de Inspección Educativa.\r\n\r\nPara elegir una nueva contraseña, abre este enlace:\r\n${link.properties.action_link}\r\n\r\nSi no lo has pedido tú, ignora este mensaje.`;
      const raw = b64([`To: ${destino}`, `Subject: ${cabecera("Recuperación de contraseña · Cuaderno de Inspección")}`, "MIME-Version: 1.0", 'Content-Type: text/plain; charset="UTF-8"', "", cuerpo].join("\r\n")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const r = await fetch("https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/messages/send", { method: "POST", headers: { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": gk, "Content-Type": "application/json" }, body: JSON.stringify({ raw }) });
      if (!r.ok) { console.error(`Gmail [${r.status}]: ${await r.text()}`); return { enviadoAlternativo: false }; }
      return { enviadoAlternativo: true };
    } catch (e) {
      console.error("Recuperación alternativa", e);
      return { enviadoAlternativo: false };
    }
  });
