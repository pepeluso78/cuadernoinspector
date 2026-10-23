// Reglas de plazos de trámites de Inspección.
// Los plazos se cuentan en DÍAS LECTIVOS: no cuentan sábados, domingos
// ni festivos (nacionales, de Castilla-La Mancha y locales de Albacete).
export const PLAZO_GENERAL = 10;

export const PLAZOS_POR_TIPO: { label: string; dias: number }[] = [
  { label: "Reclamación urgente (2 días lectivos)", dias: 2 },
  { label: "General: Nota Interior / Informe (10 días lectivos)", dias: 10 },
  { label: "Expediente (15 días lectivos)", dias: 15 },
  { label: "Expediente (30 días lectivos)", dias: 30 },
];

// Festivos del curso 2026/2027 que afectan a los plazos (sep 2026 – jun 2027):
// nacionales, Castilla-La Mancha y locales de Albacete (8 sep y 24 jun).
const FESTIVOS = new Set([
  "2026-09-08", // Virgen de los Llanos (Albacete)
  "2026-10-12", // Fiesta Nacional de España
  "2026-11-02", // Todos los Santos (trasladado, 1 nov cae en domingo)
  "2026-12-08", // Inmaculada Concepción
  "2026-12-25", // Navidad
  "2027-01-01", // Año Nuevo
  "2027-01-06", // Reyes
  "2027-03-25", // Jueves Santo
  "2027-03-26", // Viernes Santo
  "2027-03-29", // Lunes de Pascua (CLM)
  "2027-05-31", // Día de Castilla-La Mancha
  "2027-06-03", // Corpus Christi (CLM)
  "2027-06-24", // San Juan (Albacete)
]);

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

/** Día lectivo: ni sábado, ni domingo, ni festivo. */
export function esLectivo(d: Date): boolean {
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  return !FESTIVOS.has(toISODate(d));
}

/** Fecha límite = fecha de entrada + plazo en días lectivos. */
export function calcularFechaLimite(fechaEntrada: string, plazoDias: number = PLAZO_GENERAL): string {
  const d = parseISODate(fechaEntrada);
  let restantes = plazoDias;
  while (restantes > 0) {
    d.setDate(d.getDate() + 1);
    if (esLectivo(d)) restantes--;
  }
  return toISODate(d);
}

/** Días lectivos que quedan hasta la fecha límite (negativo si venció). */
export function diasRestantes(fechaLimite: string, hoy: Date = new Date()): number {
  const lim = parseISODate(fechaLimite);
  const h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (lim.getTime() === h.getTime()) return 0;
  const paso = lim > h ? 1 : -1;
  const d = new Date(h);
  let n = 0;
  while (d.getTime() !== lim.getTime()) {
    d.setDate(d.getDate() + paso);
    if (esLectivo(d)) n += paso;
  }
  return n;
}

export type Semaforo = "verde" | "amarillo" | "rojo";

/** Verde: 4 o más días lectivos; Amarillo: 1-3; Rojo: vence hoy o vencido. */
export function semaforo(dias: number): Semaforo {
  if (dias <= 0) return "rojo";
  if (dias <= 3) return "amarillo";
  return "verde";
}

export function textoCuentaAtras(dias: number): string {
  if (dias < 0) return `Vencido hace ${-dias} d lect.`;
  if (dias === 0) return "Vence hoy";
  if (dias === 1) return "Queda 1 día lectivo";
  return `Quedan ${dias} días lectivos`;
}
