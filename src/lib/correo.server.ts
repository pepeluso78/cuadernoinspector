import { correoATramite } from "@/lib/correo-parse";
import { adjuntosCorreo, decodificarAdjunto, type CorreoParte } from "@/lib/correo-adjuntos";
import { DOCUMENTOS_BUCKET, rutaDocumento } from "@/lib/documentos";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { asuntoValido, busquedaCorreo, CORREO_INICIAL } from "@/lib/correo-filtro";

const GATEWAY = "https://gmail.googleapis.com/gmail/v1";

type Part = CorreoParte;

function decode(b64: string): string {
  if (!b64) return "";
  try {
    const clean = b64.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
    return Buffer.from(clean, "base64").toString("utf-8");
  } catch {
    try {
      const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
      return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
    } catch {
      return "";
    }
  }
}

/** Recorre recursivamente todas las partes MIME del correo (incluyendo mensajes anidados) */
function extraerTextos(p: Part | undefined, acum: { plains: string[]; htmls: string[] }) {
  if (!p) return;
  const mime = (p.mimeType ?? "").toLowerCase();
  const esAdjuntoConNombre = Boolean(p.filename && p.filename.trim().length > 0);

  if (!esAdjuntoConNombre && p.body?.data) {
    const decodificado = decode(p.body.data).trim();
    if (decodificado) {
      if (mime === "text/plain") {
        acum.plains.push(decodificado);
      } else if (mime === "text/html") {
        acum.htmls.push(decodificado);
      } else if (mime.startsWith("text/")) {
        acum.plains.push(decodificado);
      }
    }
  }

  for (const sub of p.parts ?? []) {
    extraerTextos(sub, acum);
  }
}

const sinHtml = (h: string) =>
  h
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/tr>|<\/li>|<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/ /gi, " ")
    .replace(/&/gi, "&")
    .replace(/</gi, "<")
    .replace(/>/gi, ">")
    .replace(/"/gi, '"')
    .replace(/'/gi, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

function obtenerCuerpoCompleto(payload: Part, snippet?: string): string {
  const acum = { plains: [] as string[], htmls: [] as string[] };
  extraerTextos(payload, acum);

  const textoPlano = acum.plains.join("\n\n").trim();
  const textoHtml = acum.htmls.map(sinHtml).join("\n\n").trim();

  // Elegimos el que tenga más contenido real (muchos correos corporativos traen text/plain vacío y todo en text/html)
  if (textoPlano.length >= 20 && textoPlano.length >= textoHtml.length * 0.5) {
    return textoPlano;
  }
  if (textoHtml.length > 0) {
    return textoHtml;
  }
  if (textoPlano.length > 0) {
    return textoPlano;
  }
  return (snippet ?? "").trim();
}

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

/** Garantiza que el bucket DOCUMENTOS_BUCKET exista en Supabase antes de subir adjuntos */
async function asegurarBucket(db: SupabaseClient<Database>) {
  try {
    const { data: buckets } = await db.storage.listBuckets();
    const existe = (buckets ?? []).some((b) => b.id === DOCUMENTOS_BUCKET || b.name === DOCUMENTOS_BUCKET);
    if (!existe) {
      await db.storage.createBucket(DOCUMENTOS_BUCKET, { public: true });
      console.log(`Bucket '${DOCUMENTOS_BUCKET}' creado automáticamente.`);
    }
  } catch (e) {
    // Si falla listBuckets, intentamos crearlo directamente ignorando si ya existe
    await db.storage.createBucket(DOCUMENTOS_BUCKET, { public: true }).catch(() => {});
  }
}

/** Lee los correos reenviados de los últimos 30 días y crea o repara los trámites y sus adjuntos. */
export async function importarCorreos(_cliente?: SupabaseClient<Database>) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");

  // 1. Asegurar que el bucket exacto definido en DOCUMENTOS_BUCKET existe en Supabase
  await asegurarBucket(db);

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

      const cuerpoExtraido = obtenerCuerpoCompleto(m.payload, m.snippet);
      const parseado = correoATramite({
        asunto: h("subject"),
        cuerpo: cuerpoExtraido,
        fecha: new Date(Number(m.internalDate)),
        remitente: h("from"),
      });

      // Si correoATramite dejó descripcion_entrada vacía o cortó todo el texto, usamos el cuerpoExtraido íntegro
      const descripcionFinal =
        parseado.descripcion_entrada && parseado.descripcion_entrada.trim().length > 10
          ? parseado.descripcion_entrada.trim()
          : cuerpoExtraido;

      const existente = hechos.get(id);
      let tramiteId = existente?.id;

      if (!tramiteId) {
        const { data, error } = await db
          .from("tramites")
          .insert({
            ...parseado,
            descripcion_entrada: descripcionFinal,
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
      } else {
        // Si el trámite ya existía pero tenía la descripción vacía o muy corta, la actualizamos con el cuerpo real
        const descActual = (existente?.descripcion_entrada ?? "").trim();
        if (descActual.length < 15 && descripcionFinal.length > descActual.length) {
          await db
            .from("tramites")
            .update({
              descripcion_entrada: descripcionFinal,
              ...(parseado.numero_registro ? { numero_registro: parseado.numero_registro } : {}),
              ...(parseado.remitente ? { remitente: parseado.remitente } : {}),
            })
            .eq("id", tramiteId);
        }
      }

      const { data: existentes, error: docError } = await db
        .from("documentos_tramite")
        .select("correo_parte_id,nombre")
        .eq("tramite_id", tramiteId);
      if (docError) {
        errores.push(`No se pudieron comprobar los documentos de «${h("subject")}»`);
        continue;
      }
      const guardados = new Set((existentes ?? []).map((d) => d.correo_parte_id).filter(Boolean));
      const nombresGuardados = new Set((existentes ?? []).map((d) => d.nombre).filter(Boolean));

      for (const parte of adjuntosCorreo(m.payload)) {
        if (guardados.has(parte.clave) || nombresGuardados.has(parte.filename)) continue;
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

          let { error: uploadError } = await db.storage
            .from(DOCUMENTOS_BUCKET)
            .upload(ruta, bytes, { contentType: mime, upsert: true });

          // Si por cualquier motivo el bucket no existía aún, lo crea en el acto y reintenta la subida
          if (uploadError && /bucket not found/i.test(uploadError.message)) {
            await db.storage.createBucket(DOCUMENTOS_BUCKET, { public: true });
            const retry = await db.storage
              .from(DOCUMENTOS_BUCKET)
              .upload(ruta, bytes, { contentType: mime, upsert: true });
            uploadError = retry.error;
          }

          if (uploadError && !/already exists|duplicate/i.test(uploadError.message)) {
            throw uploadError;
          }

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
          guardados.add(parte.clave);
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
