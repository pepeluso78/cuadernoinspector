export type CorreoParte = {
  partId?: string;
  filename?: string;
  mimeType?: string;
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: CorreoParte[];
};

export function decodificarAdjunto(data: string): Uint8Array {
  const bin = atob(data.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
}

/** Recorre también los multipart anidados; conserva archivos, no imágenes sin nombre. */
export function adjuntosCorreo(parte: CorreoParte, ruta = "0"): (CorreoParte & { clave: string; filename: string })[] {
  const propios = parte.filename && (parte.body?.attachmentId || parte.body?.data !== undefined)
    ? [{ ...parte, filename: parte.filename, clave: parte.partId || ruta }] : [];
  return [...propios, ...(parte.parts ?? []).flatMap((p, i) => adjuntosCorreo(p, `${ruta}.${i}`))];
}

export function leerRespuestaBatch(contentType: string, body: string): { id: string; status: number; data: unknown }[] {
  const boundary = contentType.match(/boundary="?([^";\s]+)"?/i)?.[1];
  if (!/^multipart\/mixed/i.test(contentType) || !boundary) throw new Error("Respuesta múltiple de Gmail no válida");
  return body.split(`--${boundary}`).slice(1).filter((p) => p.trim() && !p.startsWith("--")).map((p) => {
    const id = p.match(/Content-ID:\s*<?(?:response-)?([^>\r\n]+)>?/i)?.[1]?.trim();
    const http = p.match(/HTTP\/\d(?:\.\d)?\s+(\d{3})[^\r\n]*\r?\n/);
    if (!id || !http || http.index === undefined) throw new Error("Parte de respuesta Gmail no válida");
    const remaining = p.slice(http.index + http[0].length);
    const split = remaining.search(/\r?\n\r?\n/);
    if (split < 0) throw new Error("Respuesta Gmail sin contenido");
    const json = remaining.slice(split).trim();
    return { id, status: Number(http[1]), data: JSON.parse(json) as unknown };
  });
}