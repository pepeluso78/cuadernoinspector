// Orden institucional de los centros en los listados:
// IES/IESO, CEIP, centros concertados (CC), CRA, educación especial,
// escuelas infantiles (EI/EEI/CPEI) y, al final, el resto (Escuela de Música,
// Conservatorio, idiomas, personas adultas…).
const PRIORIDAD: Array<[number, string[]]> = [
  [1, ["IES"]],
  [2, ["CEIP"]],
  [3, ["CC"]],
  [4, ["CRA"]],
  [5, ["EDUCACIONESPECIAL", "CPEE", "CEE"]],
  [6, ["EI", "EEI", "CPEI"]],
];

const sinTildes = (v: unknown) =>
  String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[\s.]/g, "");

function prioridad(tipo: string | null | undefined): number {
  const t = sinTildes(tipo);
  for (const [p, prefijos] of PRIORIDAD) if (prefijos.some((prefijo) => t.startsWith(prefijo))) return p;
  return PRIORIDAD.length + 1;
}

export function ordenarCentros<T extends { nombre: string; tipo_centro: string | null }>(centros: T[]): T[] {
  return [...centros].sort(
    (a, b) =>
      prioridad(a.tipo_centro) - prioridad(b.tipo_centro) ||
      a.nombre.localeCompare(b.nombre, "es"),
  );
}
