import { correoATramite } from "@/lib/correo-parse";
import { adjuntosCorreo, decodificarAdjunto, type CorreoParte } from "@/lib/correo-adjuntos";
import { DOCUMENTOS_BUCKET, rutaDocumento } from "@/lib/documentos";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { asuntoValido, busquedaCorreo, CORREO_INICIAL } from "@/lib/correo-filtro";

const GATEWAY = "https://gmail.googleapis.com/gmail/v1";

type Part = CorreoParte;

function decode(b64: string) {
  try {
    const clean = b64.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
    return Buffer.from(clean, "base64").toString("utf-8");
  } catch {
    const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
    return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
  }
}

function texto(p: Part): { plain?: string | undefined; html?: string | undefined } {
  const mime = (p.mimeType ?? "").toLowerCase();
  if (mime === "text/plain" && p.body?.data && !p.filename) {
    return { plain: decode(p.body.data) };
  }
  if (mime === "text/html" && p.body?.data && !p.filename) {
    return { html: decode(p.body.data) };
  }
  const r: { plain?: string | undefined; html?: string | undefined } = {};
  for (const sp of p.parts ?? []) {
    const t = texto(sp);
    if (t.plain) r.plain = r.plain ? `${r.plain}\n${t.plain}` : t.plain;
    if (t.html) r.html = r.html ? `${r.html}\n${t.html}` : t.html;
  }
  if (!r.plain && !r.html && p.body?.data && !p.filename) {
    r.plain = decode(p.body.data);
  }
  return r;
}

const sinHtml = (h: string) =>
  h
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/tr>|<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/ /gi, " ")
    .replace(/&/gi, "&")
    .replace(/</gi, "<")
    .replace(/>/gi, ">")
    .replace(/"/gi, '"')
    .replace(/'/gi, "'")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

async function obtenerAccessToken(): Promise<string> {
  const cid = process.env["GMAIL_CLIENT_ID"];
  const csec = process.env["GMAIL_CLIENT_SECRET"];
  const rtok = process.env["GMAIL_REFRESH_TOKEN"];
  if (!cid || !csec || !rtok) {
    throw new Error("Falta la conexión con Gmail: faltan credenciales GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET o GMAIL_REFRESH_TOKEN en Docker");
  }

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cid,
      client_secret: csec,
      refresh_token: rtok,
      grant_type: "refresh_token",
    }),
  });
  if (!r.ok) {
    const b = await r.text();
    throw new Error(`Error autenticando con Gmail OAuth: ${b}`);
  }
  const data = (await r.json()) as { access_token: string };
  return data.access_token;
}

async function gmail(path: string, token?: string) {
  const accessToken = token ?? (await obtenerAccessToken());
  const r = await fetch(`${GATEWAY}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) {
    const b = await r.text();
    console.error(`Gmail [${r.status}]: ${b}`);
    throw new Error(`Gmail respondió ${r.status}: ${b}`);
  }
  return r.json();
}

/** Lee los correos reenviados de los últimos 30 días y crea o completa los trámites y sus adjuntos. */
export async function importarCorreos(_cliente?: SupabaseClient<Database>) {
  // Usamos siempre supabaseAdmin en el servidor para evitar bloqueos de RLS o Storage
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");

  const { data: config, error: configError } = await db
    .from("configuracion_aplicacion")
    .select("correo_referencia,user_id")
    .neq("correo_referencia", "")
    .order("id")
    .limit(1)
    .maybeSingle();
  if (configError) throw configError;
  const remitenteConfigurado = config?.correo_referencia || CORREO_INICIAL;

  const accessToken = await obtenerAccessToken();
  const perfil = (await gmail(`/users/me/profile`, accessToken)) as { emailAddress?: string };
  const q = encodeURIComponent(busquedaCorreo(remitenteConfigurado, perfil.emailAddress));
  const list = (await gmail(`/users/me/messages?maxResults=50&q=${q}`, accessToken)) as { messages?: { id: string }[] };
  const ids = (list.messages ?? []).map((m) => m.id);
  if (!ids.length) return { creados: 0, adjuntos: 0, errores: [] as string[] };

  const { data: ya, error: lecturaError } = await db
    .from("tramites")
    .select("id,correo_id,descripcion_entrada")
    .in("correo_id", ids);
  if (lecturaError) throw lecturaError;
  const hechos = new Map((ya ?? []).map((r) => [r.correo_id, r]));

  let creados = 0, adjuntos = 0;
  const errores: string[] = [];

  for (const id of ids) {
    try {
      const m = (await gmail(`/users/me/messages/${id}?format=full`, accessToken)) as {
        snippet?: string;
        internalDate: string;
        payload: Part & { headers: { name: string; value: string }[] };
      };
      const h = (n: string) => m.payload.headers.find((x) => x.name.toLowerCase() === n)?.value ?? "";
      const from = h("from").match(/<([^>]+)>/)?.[1] ?? h("from").trim();
      const propia = perfil.emailAddress?.toLowerCase() === remitenteConfigurado.toLowerCase();
      if (!propia && from.toLowerCase() !== remitenteConfigurado.toLowerCase()) continue;
      if (!asuntoValido(h("subject"))) continue;

      const t = texto(m.payload);
      const textoPlano = t.plain?.trim() || "";
      const textoHtml = t.html ? sinHtml(t.html) : "";
      const cuerpo = (textoPlano.length >= textoHtml.length ? textoPlano : textoHtml) || m.snippet || "";

      const datosParseados = correoATramite({
        asunto: h("subject"),
        cuerpo,
        fecha: new Date(Number(m.internalDate)),
        remitente: h("from"),
      });

      const existente = hechos.get(id);
      let tramiteId = existente?.id;

      if (!tramiteId) {
        const { data, error } = await db
          .from("tramites")
          .insert({
            ...datosParseados,
            descripcion_entrada: datosParseados.descripcion_entrada || cuerpo,
            correo_id: id,
            ...(config?.user_id ? { user_id: config.user_id } : {}),
          })
          .select("id")
          .single();
        if (error || !data) {
          errores.push(`No se pudo crear el trámite de «${h("subject")}»: ${error?.message ?? ""}`);
          continue;
        }
        tramiteId = data.id;
        creados++;
      } else if (!existente?.descripcion_entrada && (datosParseados.descripcion_entrada || cuerpo)) {
        // Si el trámite se había creado antes con el cuerpo vacío, lo repara automáticamente
        await db
          .from("tramites")
          .update({ descripcion_entrada: datosParseados.descripcion_entrada || cuerpo })
          .eq("id", tramiteId);
      }

      const { data: existentes, error: docError } = await db
        .from("documentos_tramite")
        .select("correo_parte_id")
        .eq("tramite_id", tramiteId);
      if (docError) {
        errores.push(`No se pudieron comprobar los documentos de «${h("subject")}»`);
        continue;
      }
      const guardados = new Set((existentes ?? []).map((d) => d.correo_parte_id));

      for (const parte of adjuntosCorreo(m.payload).filter((p) => !guardados.has(p.clave))) {
        try {
          const contenido =
            parte.body?.data ??
            ((await gmail(
              `/users/me/messages/${id}/attachments/${encodeURIComponent(parte.body?.attachmentId ?? "")}`,
              accessToken
            )) as { data: string }).data;
          const bytes = decodificarAdjunto(contenido);
          const ruta = rutaDocumento(tramiteId, `correo-${id}-${parte.clave.replace(/[^\w.-]/g, "_")}`, parte.filename);
          const mime = parte.mimeType ?? "application/octet-stream";

          const { error: uploadError } = await db.storage
            .from(DOCUMENTOS_BUCKET)
            .upload(ruta, bytes, { contentType: mime, upsert: true });
          if (uploadError && !/already exists|duplicate/i.test(uploadError.message)) throw uploadError;

          const { error } = await db.from("documentos_tramite").insert({
            tramite_id: tramiteId,
            nombre: parte.filename,
            ruta,
            mime_type: mime,
            tamano: bytes.length,
            categoria: "Correo",
            correo_parte_id: parte.clave,
            ...(config?.user_id ? { user_id: config.user_id } : {}),
          });
          if (error && !/duplicate|unique/i.test(error.message)) throw error;
          adjuntos++;
        } catch (e) {
          console.error("Adjunto no importado", parte.filename, e);
          errores.push(`No se pudo guardar «${parte.filename}»: ${e instanceof Error ? e.message : ""}`);
        }
      }
    } catch (e) {
      errores.push(`No se pudo leer el correo ${id}`);
      console.error("Error leyendo correo", id, e);
    }
  }
  return { creados, adjuntos, errores };
}
