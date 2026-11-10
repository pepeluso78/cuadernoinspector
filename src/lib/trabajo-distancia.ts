import { FESTIVOS, toISODate } from "./plazos";

/** Curso: del 1 de septiembre al 15 de julio (ambos incluidos). */
export function enPeriodoTrabajoDistancia(d: Date) {
  const m = d.getMonth();
  return m >= 8 || m < 6 || (m === 6 && d.getDate() <= 15);
}

/** dia: 1 = lunes … 5 = viernes; null = sin día asignado. */
export function esTrabajoDistancia(d: Date, dia: number | null | undefined) {
  if (!dia || d.getDay() !== dia) return false;
  return enPeriodoTrabajoDistancia(d) && !FESTIVOS[toISODate(d)];
}
