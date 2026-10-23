import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Centro, Evento } from "@/lib/queries";
import logoAsset from "@/assets/jccm-logo.asset.json";

export async function crearResenaPDF(visita: Evento, centro: Centro, logoBytes?: ArrayBuffer) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const response = logoBytes ? null : await fetch(logoAsset.url);
  if (response && !response.ok) throw new Error("No se ha podido cargar el logotipo de JCCM");
  const logo = await doc.embedPng(logoBytes ?? await response?.arrayBuffer() ?? new ArrayBuffer(0));
  const ink = rgb(0.1, 0.1, 0.1), grey = rgb(0.85, 0.85, 0.85);
  const clean = (value: string) => [...value.replace(/\t/g, "    ")].map((char) => {
    if (char === "\n" || char === "\r") return char;
    try { font.encodeText(char); return char; } catch { return "?"; }
  }).join("");
  const wrap = (text: string, width = 490) => {
    const lines: string[] = [];
    for (const paragraph of clean(text).split(/\r?\n/)) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, 11) <= width) { line = candidate; continue; }
        if (line) lines.push(line);
        line = "";
        for (const char of word) {
          if (font.widthOfTextAtSize(line + char, 11) > width) { lines.push(line); line = ""; }
          line += char;
        }
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
    page.drawText(`Delegación Provincial de ${visita.provincia_visita}`, { x: 48, y: 719, font: bold, size: 10 });
    page.drawText("Servicio de Inspección Educativa", { x: 48, y: 707, font: bold, size: 10 });
    page.drawText("RESEÑA DE VISITA", { x: 405, y: 713, font: bold, size: 11 });
    y = 682;
  }
  function nextPage() { page = doc.addPage([595.28, 841.89]); header(); }
  function box(label: string, text: string) {
    const lines = wrap(text || "—");
    let offset = 0;
    do {
      if (y < 130) nextPage();
      const count = Math.min(lines.length - offset, Math.max(1, Math.floor((y - 96) / 15) - 2));
      const height = 31 + count * 15;
      page.drawRectangle({ x: 42, y: y - height, width: 511, height, borderColor: ink, borderWidth: 0.7 });
      page.drawText(label + (offset ? " (continuación)" : ""), { x: 49, y: y - 15, font: bold, size: 11 });
      lines.slice(offset, offset + count).forEach((line, i) => page.drawText(line, { x: 49, y: y - 32 - i * 15, font, size: 11 }));
      offset += count; y -= height + 12;
      if (offset < lines.length) nextPage();
    } while (offset < lines.length);
  }
  const fecha = new Date(visita.fecha_inicio).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });
  header();
  box("Centro y fecha de visita", `${centro.nombre} · Código: ${centro.codigo_centro}\nMunicipio: ${centro.localidad ?? ""}\nFecha: ${fecha}`);
  box("Inspector que realiza la visita", visita.inspector_visita);
  box("Objetivo de la visita", visita.titulo);
  box("Breve Descripción de la visita", visita.descripcion_visita);
  box("Principales Problemas Detectados", visita.problemas_visita);
  box("Recomendaciones Formuladas", visita.recomendaciones_visita);
  if (y < 110) nextPage();
  page.drawText(clean(`${visita.provincia_visita}, a ${fecha}`), { x: 260, y: y - 12, font, size: 11 });
  page.drawText(clean(visita.cargo_visita), { x: 260, y: y - 30, font, size: 11 });
  wrap(visita.inspector_visita, 270).forEach((line, i) => page.drawText(line, { x: 280, y: y - 47 - i * 15, font, size: 11 }));
  doc.getPages().forEach((p, i) => p.drawText(`${i + 1} / ${doc.getPageCount()}`, { x: 510, y: 35, font, size: 9 }));
  doc.setTitle(`Reseña de visita · ${centro.nombre}`);
  return doc.save();
}

export async function descargarResenaPDF(visita: Evento, centro: Centro) {
  const bytes = await crearResenaPDF(visita, centro);
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url; link.download = `Resena_${centro.codigo_centro}_${visita.fecha_inicio.slice(0, 10)}.pdf`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}