import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Database } from "@/integrations/supabase/types";
import logoAsset from "@/assets/jccm-logo.asset.json";

export type Guardia = Database["public"]["Tables"]["guardias"]["Row"];

export function nombreArchivoGuardia(fecha: string) {
  return `Reporte de Guardia ${fecha.replaceAll("-", "")}.pdf`;
}

export async function crearGuardiaPDF(g: Guardia, centroNombre: string) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const res = await fetch(logoAsset.url);
  if (!res.ok) throw new Error("No se ha podido cargar el logotipo de JCCM");
  const logo = await doc.embedPng(await res.arrayBuffer());
  const ink = rgb(0.1, 0.1, 0.1), grey = rgb(0.85, 0.85, 0.85);
  const clean = (v: string) => [...v.replace(/\t/g, "    ")].map((c) => {
    if (c === "\n" || c === "\r") return c;
    try { font.encodeText(c); return c; } catch { return "?"; }
  }).join("");
  const wrap = (text: string, width = 490) => {
    const lines: string[] = [];
    for (const p of clean(text).split(/\r?\n/)) {
      let line = "";
      for (const w of p.split(/\s+/)) {
        const cand = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(cand, 11) <= width) { line = cand; continue; }
        if (line) lines.push(line);
        line = "";
        for (const ch of w) { if (font.widthOfTextAtSize(line + ch, 11) > width) { lines.push(line); line = ""; } line += ch; }
      }
      lines.push(line);
    }
    return lines;
  };
  let page = doc.addPage([595.28, 841.89]);
  let y = 700;
  function header() {
    page.drawImage(logo, { x: 42, y: 749, width: 43, height: 62 });
    page.drawText("CONSEJERÍA DE EDUCACIÓN", { x: 190, y: 778, font: bold, size: 12, color: ink });
    page.drawText("JUNTA DE COMUNIDADES DE CASTILLA-LA MANCHA", { x: 123, y: 760, font: bold, size: 11, color: ink });
    page.drawRectangle({ x: 42, y: 702, width: 511, height: 32, color: grey, borderColor: ink, borderWidth: 0.7 });
    page.drawText(clean(`Delegación Provincial de ${g.provincia_guardia}`), { x: 48, y: 719, font: bold, size: 10 });
    page.drawText("Servicio de Inspección Educativa", { x: 48, y: 707, font: bold, size: 10 });
    page.drawText("REPORTE DE GUARDIA", { x: 395, y: 713, font: bold, size: 11 });
    y = 682;
  }
  function nextPage() { page = doc.addPage([595.28, 841.89]); header(); }
  function box(label: string, lines: string[], minLines = 0) {
    let off = 0;
    do {
      if (y < 130) nextPage();
      const want = off === 0 ? Math.max(lines.length, minLines) : lines.length;
      const count = Math.min(want - off, Math.max(1, Math.floor((y - 96) / 15) - 2));
      const h = 31 + count * 15;
      page.drawRectangle({ x: 42, y: y - h, width: 511, height: h, borderColor: ink, borderWidth: 0.7 });
      page.drawText(label + (off ? " (continuación)" : ""), { x: 49, y: y - 15, font: bold, size: 11 });
      lines.slice(off, off + count).forEach((l, i) => page.drawText(l, { x: 49, y: y - 32 - i * 15, font, size: 11 }));
      off += count; y -= h + 12;
      if (off < lines.length) nextPage();
    } while (off < lines.length);
  }
  const fecha = new Date(`${g.fecha}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  header();
  const persona = [g.persona_nombre, g.persona_condicion, g.persona_contacto].filter(Boolean).join(" · ");
  box("Atención recibida", [
    ...wrap(`Fecha: ${fecha} · Atención: ${g.modalidad}`),
    ...wrap(`Persona atendida: ${persona || "—"}`),
    ...wrap(`Inspector/a de guardia: ${g.inspector_guardia}`),
    ...wrap(`Inspector/a del centro: ${g.inspector_centro || "—"}`),
    ...wrap(`Centro educativo: ${centroNombre || "—"}`),
  ]);
  box("Incidencia tratada", wrap(g.incidencia || "—"), 6);
  box("Respuesta dada por el inspector de guardia", wrap(g.respuesta || "—"), 6);

  if (y < 110) nextPage();
  page.drawText(clean(`${g.provincia_guardia}, a ${fecha}`), { x: 260, y: y - 12, font, size: 11 });
  page.drawText(clean(g.cargo_guardia), { x: 260, y: y - 30, font, size: 11 });
  wrap(g.inspector_guardia, 270).forEach((l, i) => page.drawText(l, { x: 280, y: y - 47 - i * 15, font, size: 11 }));
  doc.getPages().forEach((p, i) => p.drawText(`${i + 1} / ${doc.getPageCount()}`, { x: 510, y: 35, font, size: 9 }));
  doc.setTitle(`Reporte de Guardia · ${fecha}`);
  return doc.save();
}

export async function descargarGuardiaPDF(g: Guardia, centroNombre: string) {
  const bytes = await crearGuardiaPDF(g, centroNombre);
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url; a.download = nombreArchivoGuardia(g.fecha);
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
