import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { periodoAgenda, type EntradaAgenda, type VistaAgenda } from "./agenda-export";
import { FESTIVOS } from "./plazos";
import logoAsset from "@/assets/jccm-logo.asset.json";

type Opciones = { vista: VistaAgenda; referencia: Date; hoy: Date; entradas: EntradaAgenda[]; inspector: string; provincia: string };

export async function crearAgendaPDF(opciones: Opciones, logoBytes?: ArrayBuffer) {
  const { vista, referencia, hoy, entradas, inspector, provincia } = opciones;
  const periodo = periodoAgenda(vista, referencia, hoy);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const response = logoBytes ? null : await fetch(logoAsset.url);
  if (response && !response.ok) throw new Error("No se ha podido cargar el logotipo de JCCM");
  const logo = await doc.embedPng(logoBytes ?? await response?.arrayBuffer() ?? new ArrayBuffer(0));
  // Print-only palette; independent of the application's selected screen theme.
  const ink = rgb(0.12, 0.15, 0.18), muted = rgb(0.4, 0.43, 0.46), border = rgb(0.77, 0.79, 0.81);
  const pale = rgb(0.95, 0.96, 0.97), holiday = rgb(0.99, 0.94, 0.94), crimson = rgb(0.65, 0.1, 0.18);
  const [width, height] = vista === "agenda" ? [595.28, 841.89] : [841.89, 595.28];
  const margin = 32, contentWidth = width - 2 * margin;
  const clean = (v: string) => [...v.replace(/\t/g, " ")].map((c) => {
    if (c === "\n" || c === "\r") return c;
    try { font.encodeText(c); return c; } catch { return "?"; }
  }).join("");
  const wrap = (text: string, maxWidth: number, size: number) => {
    const lines: string[] = [];
    for (const p of clean(text).split(/\r?\n/)) {
      let line = "";
      for (const word of p.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) <= maxWidth) { line = next; continue; }
        if (line) lines.push(line);
        line = "";
        for (const char of word) {
          if (font.widthOfTextAtSize(line + char, size) > maxWidth) { lines.push(line); line = ""; }
          line += char;
        }
      }
      lines.push(line);
    }
    return lines;
  };
  let page = doc.addPage([width, height]), y = 0;
  const text = (v: string, x: number, top: number, size = 10, strong = false, color = ink) => page.drawText(clean(v), { x, y: top, font: strong ? bold : font, size, color });
  function header(continuacion = false) {
    page.drawImage(logo, { x: margin, y: height - 77, width: 28, height: 41 });
    text("SIE-CLM | Cuaderno de Inspección Educativa", margin + 42, height - 43, 12, true);
    text(`Servicio de Inspección · Delegación Provincial de ${provincia}`, margin + 42, height - 59, 9);
    const title = `${vista === "agenda" ? "AGENDA" : "CALENDARIO"} · ${periodo.titulo}${continuacion ? " (continuación)" : ""}`;
    let top = height - 100;
    for (const l of wrap(title, contentWidth, 13)) { text(l, margin, top, 13, true); top -= 17; }
    for (const l of wrap(inspector, contentWidth, 9)) { text(l, margin, top - 1, 9, false, muted); top -= 12; }
    y = top - 15;
  }
  function nextPage() { page = doc.addPage([width, height]); header(true); }
  header();
  if (vista !== "agenda") {
    const col = contentWidth / 7;
    const weekdays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    function weekHeader() {
      page.drawRectangle({ x: margin, y: y - 20, width: contentWidth, height: 20, color: pale });
      weekdays.forEach((d, i) => text(d, margin + i * col + 5, y - 13, 9, true));
      y -= 20;
    }
    weekHeader();
    const weeks = Array.from({ length: periodo.dias.length / 7 }, (_, i) => periodo.dias.slice(i * 7, i * 7 + 7));
    for (const week of weeks) {
      const cells = week.map((d) => {
        const date = format(d, "yyyy-MM-dd");
        const lines: string[] = [];
        if (FESTIVOS[date]) lines.push(...wrap(FESTIVOS[date], col - 10, 8), "");
        entradas.filter((e) => e.fecha === date).forEach((e) => {
          lines.push(...wrap(`${e.hora ? `${e.hora} · ` : ""}${e.tipo}: ${e.titulo}${e.realizada && !e.guardia ? " (Realizada)" : ""}${e.centro ? `\n${e.centro}` : ""}`, col - 10, 8), "");
        });
        return lines;
      });
      const total = Math.max(1, ...cells.map((c) => c.length));
      let offset = 0;
      do {
        const idealHeight = Math.max(60, 25 + (total - offset) * 10);
        if (y - Math.min(idealHeight, height - 205) < 48) { nextPage(); weekHeader(); }
        const count = Math.min(total - offset, Math.max(1, Math.floor((y - 48 - 25) / 10)));
        const rowHeight = Math.max(60, 25 + count * 10);
        week.forEach((d, i) => {
          const date = format(d, "yyyy-MM-dd"), x = margin + i * col;
          page.drawRectangle({ x, y: y - rowHeight, width: col, height: rowHeight, borderColor: border, borderWidth: 0.5, ...(FESTIVOS[date] ? { color: holiday } : d.getDay() === 0 || d.getDay() === 6 ? { color: pale } : {}) });
          text(`${format(d, "d/MM")}${offset ? " (cont.)" : ""}`, x + 5, y - 14, 9, true, FESTIVOS[date] ? crimson : ink);
          cells[i].slice(offset, offset + count).forEach((l, j) => text(l, x + 5, y - 28 - j * 10, 8));
        });
        y -= rowHeight;
        offset += count;
      } while (offset < total);
    }
  } else if (!entradas.length) {
    text("No hay eventos pendientes desde esta fecha.", margin, y, 11);
  } else {
    for (const e of entradas) {
      const date = format(new Date(`${e.fecha}T12:00:00`), "EEEE dd/MM/yyyy", { locale: es });
      const lines = wrap(`${e.tipo} · ${e.titulo}${e.centro ? `\nCentro: ${e.centro}` : ""}`, contentWidth - 12, 10);
      let offset = 0;
      do {
        if (y < 110) nextPage();
        const count = Math.min(lines.length - offset, Math.max(1, Math.floor((y - 75) / 14) - 2));
        text(`${date} · ${e.hora}${offset ? " (continuación)" : ""}`, margin, y, 10, true);
        lines.slice(offset, offset + count).forEach((l, j) => text(l, margin, y - 20 - j * 14, 10));
        y -= 34 + count * 14;
        page.drawLine({ start: { x: margin, y: y + 7 }, end: { x: width - margin, y: y + 7 }, color: border, thickness: 0.5 });
        offset += count;
        if (offset < lines.length) nextPage();
      } while (offset < lines.length);
    }
  }
  doc.getPages().forEach((p, i) => p.drawText(`SIE-CLM · ${format(hoy, "dd/MM/yyyy")} · ${i + 1} / ${doc.getPageCount()}`, { x: margin, y: 25, font, size: 8, color: muted }));
  doc.setTitle(`${vista === "agenda" ? "Agenda de pendientes" : "Calendario"} · ${periodo.titulo}`);
  return doc.save();
}

export async function descargarAgendaPDF(opciones: Opciones) {
  const bytes = await crearAgendaPDF(opciones);
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  const inicio = periodoAgenda(opciones.vista, opciones.referencia, opciones.hoy).inicio;
  link.download = opciones.vista === "agenda" ? `Agenda pendientes desde ${format(inicio, "yyyyMMdd")}.pdf`
    : opciones.vista === "mes" ? `Calendario ${format(opciones.referencia, "yyyyMM")}.pdf` : `Calendario semana ${format(inicio, "yyyyMMdd")}.pdf`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}