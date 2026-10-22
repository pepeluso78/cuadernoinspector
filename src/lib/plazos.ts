// Reglas de plazos de trámites de Inspección.
export const PLAZO_GENERAL = 10;

export const PLAZOS_POR_TIPO: { label: string; dias: number }[] = [
  { label: "Reclamación urgente (2 días)", dias: 2 },
  { label: "General: Nota Interior / Informe (10 días)", dias: 10 },
  { label: "Expediente (15 días)", dias: 15 },
  { label: "Expediente (30 días)", dias: 30 },
];

/** Parse "YYYY-MM-DD" as a local date (no timezone shift). */
export function parseISODate(s: string): Date {
  const [y = 1970, m = 1, d = 1] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Fecha límite = fecha de entrada + plazo (días naturales). */
export function calcularFechaLimite(fechaEntrada: string, plazoDias: number = PLAZO_GENERAL): string {
  const d = parseISODate(fechaEntrada);
  d.setDate(d.getDate() + plazoDias);
  return toISODate(d);
}

export function diasRestantes(fechaLimite: string, hoy: Date = new Date()): number {
  const lim = parseISODate(fechaLimite);
  const h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((lim.getTime() - h.getTime()) / 86400000);
}

export type Semaforo = "verde" | "amarillo" | "rojo";

/** Verde: 4 o más días; Amarillo: 1-3 días; Rojo: vence hoy o vencido. */
export function semaforo(dias: number): Semaforo {
  if (dias <= 0) return "rojo";
  if (dias <= 3) return "amarillo";
  return "verde";
}

export function textoCuentaAtras(dias: number): string {
  if (dias < 0) return `Vencido hace ${-dias} d`;
  if (dias === 0) return "Vence hoy";
  if (dias === 1) return "Queda 1 día";
  return `Quedan ${dias} días`;
}
