import { correoATramite } from "@/lib/correo-parse";

const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

type Part = { mimeType?: string; body?: { data?: string }; parts?: Part[] };

function decode(b64: string) {
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
}
function texto(p: Part): { plain?: string; html?: string } {
  if (p.mimeType === "text/plain" && p.body?.data) return { plain: decode(p.body.data) };
  if (p.mimeType === "text/html" && p.body?.data) return { html: decode(p.body.data) };
  const r: { plain?: string; html?: string } = {};
  for (const sp of p.parts ?? []) { const t = texto(sp); r.plain ??= t.plain; r.html ??= t.html; }
  return r;
}
const sinHtml = (h: string) => h.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<br\s*\/?>|<\/p>|<\/div>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\n{3,}/g, "\n\n").trim();

async function gmail(path: string) {
  const lk = process.env["LOVABLE_API_KEY"], gk = process.env["GOOGLE_MAIL_API_KEY"];
  if (!lk || !gk) throw new Error("Falta la conexión con Gmail");
  const r = await fetch(`${GATEWAY}${path}`, { headers: { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": gk } });
  if (!r.ok) { const b = await r.text(); console.error(`Gmail [${r.status}]: ${b}`); throw new Error(`Gmail respondió ${r.status}`); }
  return r.json();
}

/** Lee los correos reenviados de los últimos 30 días y crea los trámites que falten. */
export async function importarCorreos() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const q = encodeURIComponent("newer_than:30d -in:sent -in:chats");
  const list = (await gmail(`/users/me/messages?maxResults=50&q=${q}`)) as { messages?: { id: string }[] };
  const ids = (list.messages ?? []).map((m) => m.id);
  if (!ids.length) return { creados: 0 };
  const { data: ya } = await supabaseAdmin.from("tramites").select("correo_id").in("correo_id", ids);
  const hechos = new Set((ya ?? []).map((r) => r.correo_id));
  let creados = 0;
  for (const id of ids.filter((i) => !hechos.has(i))) {
    const m = (await gmail(`/users/me/messages/${id}?format=full`)) as { internalDate: string; payload: Part & { headers: { name: string; value: string }[] } };
    const h = (n: string) => m.payload.headers.find((x) => x.name.toLowerCase() === n)?.value ?? "";
    const t = texto(m.payload);
    const cuerpo = t.plain ?? (t.html ? sinHtml(t.html) : "");
    const { error } = await supabaseAdmin.from("tramites").insert({
      ...correoATramite({ asunto: h("subject"), cuerpo, fecha: new Date(Number(m.internalDate)), remitente: h("from") }),
      correo_id: id,
    });
    if (error) console.error("No se pudo crear trámite", id, error.message); else creados++;
  }
  return { creados };
}
