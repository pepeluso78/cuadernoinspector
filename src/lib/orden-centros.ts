// Orden institucional de centros en los listados:
// IES/IESO, CEIP, CC, CRA, EI y al final el resto.
const PRIORIDAD: Array<[number, string]> = [
  [1, "IES"],
  [2, "CEIP"],
  [3, "CC"],
  [4, "CRA"],
  [5, "EI"],
];

function prioridad(tipo: string | null | undefined): number {
  const t = (tipo ?? "").toUpperCase().replace(/[\s.]/g, "");
  for (const [p, prefijo] of PRIORIDAD) if (t.startsWith(prefijo)) return p;
  return 6;
}

export function ordenarCentros<T extends { nombre: string; tipo_centro: string | null }>(centros: T[]): T[] {
  return [...centros].sort(
    (a, b) =>
      prioridad(a.tipo_centro) - prioridad(b.tipo_centro) ||
      a.nombre.localeCompare(b.nombre, "es"),
  );
}
