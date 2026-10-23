import type { Centro } from "@/lib/queries";
import { INSPECTOR } from "@/lib/constants";
import { type Configuracion, CONFIG_INICIAL, nombreInspector } from "@/lib/configuracion";

type Nota = { titulo: string; contenido: string | null; categoria: string | null; fecha_registro: string | null; importante: boolean | null };

const esc = (s: string | null | undefined) =>
  (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const ETIQUETAS: Record<string, string> = { Incidencia: "Incidencias", "Conversación": "Conversaciones", Documento: "Documentos", Otros: "Otros aspectos" };

export function exportarCuadernoPDF(c: Centro, notas: Nota[], config: Configuracion = CONFIG_INICIAL) {
  const w = window.open("", "_blank");
  if (!w) return false;
  const fecha = (f: string | null) => (f ? new Date(f).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "");
  const secciones = Object.keys(ETIQUETAS).map((cat) => {
    const ns = notas.filter((n) => n.categoria === cat);
    if (!ns.length) return "";
    return `<h2>${ETIQUETAS[cat]}</h2>` + ns.map((n) => `
      <div class="nota">
        <div class="meta">${esc(fecha(n.fecha_registro))}${n.importante ? " · ★ Importante" : ""}</div>
        <div class="tit">${esc(n.titulo)}</div>
        <div class="txt">${esc(n.contenido)}</div>
      </div>`).join("");
  }).join("");
  const cargo = (l: string, n: string | null, e: string | null) => `<tr><td>${l}</td><td>${esc(n) || "—"}</td><td>${esc(e)}</td></tr>`;
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Cuaderno de Campo - ${esc(c.nombre)}</title>
<style>
@page{size:A4;margin:18mm}
body{font-family:Georgia,"Times New Roman",serif;color:#1e293b;font-size:11pt;line-height:1.45}
.cab{border-bottom:3px solid #9b1c31;padding-bottom:8px;margin-bottom:14px}
.eyebrow{font:600 8pt Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#64748b}
h1{color:#1e3a5f;margin:4px 0;font-size:20pt}
h2{color:#1e3a5f;font-size:13pt;border-bottom:1px solid #cbd5e1;margin-top:20px}
table{border-collapse:collapse;width:100%;font:9.5pt Arial,sans-serif}
td{border:1px solid #cbd5e1;padding:4px 6px}
.nota{border-left:3px solid #9b1c31;padding:4px 10px;margin:8px 0;page-break-inside:avoid}
.meta{font:8.5pt monospace;color:#64748b}.tit{font-weight:bold}.txt{white-space:pre-wrap}
.pie{margin-top:24px;font:8pt Arial,sans-serif;color:#64748b}
</style></head><body>
<div class="cab"><div class="eyebrow">Cuaderno de Campo · ${esc(c.tipo_centro)} · ${esc(c.codigo_centro)} · ${esc(c.localidad)}</div>
<h1>${esc(c.nombre)}</h1><div class="eyebrow">${esc(nombreInspector(config))} · ${esc(config.cargo)} · ${esc(config.provincia)}</div></div>
<table>${cargo("Director/a", c.director_nombre, c.director_email)}${cargo("Jefe/a de Estudios", c.jefe_estudios_nombre, c.jefe_estudios_email)}${cargo("Secretario/a", c.secretario_nombre, c.secretario_email)}</table>
${secciones || "<p><em>Sin notas registradas.</em></p>"}
<div class="pie">Exportado el ${new Date().toLocaleString("es-ES")}</div>
<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
</body></html>`);
  w.document.close();
  return true;
}
