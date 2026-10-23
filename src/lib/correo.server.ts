import { correoATramite } from "@/lib/correo-parse";
import { adjuntosCorreo, decodificarAdjunto, leerRespuestaBatch, type CorreoParte } from "@/lib/correo-adjuntos";
import { DOCUMENTOS_BUCKET, rutaDocumento } from "@/lib/documentos";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { busquedaCorreo, CORREO_INICIAL } from "@/lib/correo-filtro";

const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

type Part = CorreoParte;

function decode(b64: string) {
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
}
function texto(p: Part): { plain?: string | undefined; html?: string | undefined } {
  if (p.mimeType === "text/plain" && p.body?.data) return { plain: decode(p.body.data) };
  if (p.mimeType === "text/html" && p.body?.data) return { html: decode(p.body.data) };
  const r: { plain?: string | undefined; html?: string | undefined } = {};
  for (const sp of p.parts ?? []) { const t = texto(sp); r.plain ??= t.plain; r.html ??= t.html; }
  return r;
}
const sinHtml = (h: string) => h.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<br\s*\/?>|<\/p>|<\/div>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\n{3,}/g, "\n\n").trim();

async function gmail(path: string) {
  const lk = process.env["LOVABLE_API_KEY"], gk = process.env["GOOGLE_MAIL_API_KEY"];
  if (!lk || !gk) throw new Error("Falta la conexión con Gmail");
  const r = await fetch(`${GATEWAY}${path}`, { headers: { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": gk } });
  if (!r.ok) { const b = await r.text(); console.error(`Gmail [${r.status}]: ${b}`); throw new Error(`Gmail respondió ${r.status}: ${b}`); }
  return r.json();
}

/** Lee los correos reenviados de los últimos 30 días y crea los trámites que falten. */
export async function importarCorreos(cliente?: SupabaseClient<Database>) {
  const db = cliente ?? (await import("@/integrations/supabase/client.server")).supabaseAdmin;
  const { data: config, error: configError } = await db.from("configuracion_aplicacion").select("correo_referencia").eq("id", 1).maybeSingle();
  if (configError) throw configError;
  const remitenteConfigurado = config?.correo_referencia ?? CORREO_INICIAL;
  const q = encodeURIComponent(busquedaCorreo(remitenteConfigurado));
  const list = (await gmail(`/users/me/messages?maxResults=50&q=${q}`)) as { messages?: { id: string }[] };
  const ids = (list.messages ?? []).map((m) => m.id);
  if (!ids.length) return { creados: 0, adjuntos: 0, errores: [] as string[] };
  const { data: ya, error: lecturaError } = await db.from("tramites").select("id,correo_id").in("correo_id", ids);
  if (lecturaError) throw lecturaError;
  const hechos = new Map((ya ?? []).map((r) => [r.correo_id, r.id]));
  const lk = process.env["LOVABLE_API_KEY"], gk = process.env["GOOGLE_MAIL_API_KEY"];
  if (!lk || !gk) throw new Error("Falta la conexión con Gmail");
  const boundary = `batch_${crypto.randomUUID()}`;
  const body = ids.map((id) => `--${boundary}\r\nContent-Type: application/http\r\nContent-ID: <${id}>\r\n\r\nGET /gmail/v1/users/me/messages/${id}?format=full HTTP/1.1\r\n\r\n`).join("") + `--${boundary}--\r\n`;
  const response = await fetch("https://connector-gateway.lovable.dev/google_mail/batch/gmail/v1", {
    method: "POST", headers: { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": gk, "Content-Type": `multipart/mixed; boundary=${boundary}` }, body,
  });
  if (!response.ok) { const b = await response.text(); console.error(`Gmail [${response.status}]: ${b}`); throw new Error(`Gmail respondió ${response.status}: ${b}`); }
  const mensajes = leerRespuestaBatch(response.headers.get("content-type") ?? "", await response.text());
  let creados = 0, adjuntos = 0;
  const errores: string[] = [];
  for (const item of mensajes) {
    const id = item.id;
    if (item.status < 200 || item.status >= 300) { errores.push(`No se pudo leer el correo ${id}: Gmail ${item.status}`); console.error("Gmail", item.status, item.data); continue; }
    const m = item.data as { internalDate: string; payload: Part & { headers: { name: string; value: string }[] } };
    const h = (n: string) => m.payload.headers.find((x) => x.name.toLowerCase() === n)?.value ?? "";
    // La búsqueda no sustituye la comprobación del remitente real.
    const from = h("from").match(/<([^>]+)>/)?.[1] ?? h("from").trim();
    if (from.toLowerCase() !== remitenteConfigurado.toLowerCase()) continue;
    const t = texto(m.payload);
    const cuerpo = t.plain ?? (t.html ? sinHtml(t.html) : "");
    let tramiteId = hechos.get(id);
    if (!tramiteId) {
      const { data, error } = await db.from("tramites").insert({
        ...correoATramite({ asunto: h("subject"), cuerpo, fecha: new Date(Number(m.internalDate)), remitente: h("from") }), correo_id: id,
      }).select("id").single();
      if (error || !data) { errores.push(`No se pudo crear el trámite de «${h("subject") }»`); continue; }
      tramiteId = data.id; creados++;
    }
    const { data: existentes, error: docError } = await db.from("documentos_tramite").select("correo_parte_id").eq("tramite_id", tramiteId);
    if (docError) { errores.push(`No se pudieron comprobar los documentos de «${h("subject") }»`); continue; }
    const guardados = new Set((existentes ?? []).map((d) => d.correo_parte_id));
    for (const parte of adjuntosCorreo(m.payload).filter((p) => !guardados.has(p.clave))) {
      try {
        const contenido = parte.body?.data ?? ((await gmail(`/users/me/messages/${id}/attachments/${encodeURIComponent(parte.body?.attachmentId ?? "")}`)) as { data: string }).data;
        const bytes = decodificarAdjunto(contenido);
        const ruta = rutaDocumento(tramiteId, `correo-${id}-${parte.clave.replace(/[^\w.-]/g, "_")}`, parte.filename);
        const mime = parte.mimeType ?? "application/octet-stream";
        const { error: uploadError } = await db.storage.from(DOCUMENTOS_BUCKET).upload(ruta, bytes, { contentType: mime, upsert: false });
        // Una carga terminada sin metadatos se recupera en el siguiente intento.
        if (uploadError && !/already exists|duplicate/i.test(uploadError.message)) throw uploadError;
        const { error } = await db.from("documentos_tramite").upsert({ tramite_id: tramiteId, nombre: parte.filename, ruta, mime_type: mime, tamano: bytes.length, categoria: "Correo", correo_parte_id: parte.clave }, { onConflict: "tramite_id,correo_parte_id", ignoreDuplicates: true });
        if (error) throw error;
        adjuntos++;
      } catch (e) {
        console.error("Adjunto no importado", parte.filename, e);
        errores.push(`No se pudo guardar «${parte.filename}». Se reintentará en la próxima importación.`);
      }
    }
  }
  return { creados, adjuntos, errores };
}
