import type { Centro, ParteAusencias } from "@/lib/queries";
import { type Configuracion, CONFIG_INICIAL, nombreInspector, servicioProvincial } from "@/lib/configuracion";

const esc = (s: string | null | undefined) =>
  (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const MESES_PARTES = ["Septiembre", "Octubre", "Noviembre", "Diciembre", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio"] as const;

export function exportarPartePDF(c: Centro, partes: ParteAusencias[], curso: string, config: Configuracion = CONFIG_INICIAL) {
  const w = window.open("", "_blank");
  if (!w) return false;
  const mapa = new Map(partes.map((p) => [p.mes, p]));
  const presentados = MESES_PARTES.filter((m) => mapa.get(m)?.presentado).length;
  const filas = MESES_PARTES.map((m) => {
    const p = mapa.get(m);
    const fecha = p?.fecha_presentacion ? new Date(p.fecha_presentacion).toLocaleDateString("es-ES") : "—";
    return `<tr>
      <td>${m}</td>
      <td class="${p?.presentado ? "ok" : "no"}">${p?.presentado ? "Presentado" : "No presentado"}</td>
      <td>${fecha}</td>
      <td>${esc(p?.observaciones) || "—"}</td>
    </tr>`;
  }).join("");
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Partes de Ausencias - ${esc(c.nombre)}</title>
<style>
@page{size:A4;margin:18mm}
body{font-family:Georgia,"Times New Roman",serif;color:#1e293b;font-size:11pt;line-height:1.45}
.cab{border-bottom:3px solid #9b1c31;padding-bottom:8px;margin-bottom:14px}
.eyebrow{font:600 8pt Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#64748b}
h1{color:#1e3a5f;margin:4px 0;font-size:18pt}
.resumen{margin:10px 0;font:10pt Arial,sans-serif}
table{border-collapse:collapse;width:100%;font:9.5pt Arial,sans-serif}
th{background:#1e3a5f;color:#fff;text-align:left}
th,td{border:1px solid #cbd5e1;padding:4px 6px}
.ok{color:#166534;font-weight:bold}.no{color:#9b1c31;font-weight:bold}
.firma{margin-top:48px;display:flex;justify-content:space-between;font:9.5pt Arial,sans-serif}
.pie{margin-top:24px;font:8pt Arial,sans-serif;color:#64748b}
</style></head><body>
<div class="cab">
  <div class="eyebrow">Inspección de Educación · ${esc(servicioProvincial(config.provincia))}</div>
  <h1>Informe de partes de ausencias · Curso ${esc(curso)}</h1>
  <div class="eyebrow">${esc(c.nombre)} · ${esc(c.codigo_centro)} · ${esc(c.localidad)}</div>
</div>
<p class="resumen"><strong>Resumen:</strong> ${presentados} de 10 partes presentados. Pendientes: ${10 - presentados}.</p>
<table>
  <thead><tr><th>Mes</th><th>Estado</th><th>Fecha de presentación</th><th>Observaciones</th></tr></thead>
  <tbody>${filas}</tbody>
</table>
<div class="firma">
  <div>En ${esc(config.provincia)}, a ${new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</div>
  <div>Fdo.: ${esc(nombreInspector(config))}<br/>${esc(config.cargo)}</div>
</div>
<div class="pie">Documento generado desde SIE-CLM · Cuaderno de Inspección Educativa</div>
<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
</body></html>`);
  w.document.close();
  return true;
}
