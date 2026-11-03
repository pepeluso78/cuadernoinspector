export type CentroImportado = {
  localidad: string | null;
  nombre: string;
  codigo_centro: string;
  telefono: string | null;
  email_centro: string | null;
  director_nombre: string | null;
  jefe_estudios_nombre: string | null;
  secretario_nombre: string | null;
  tipo_centro: string;
};

const norm = (v: unknown) =>
  String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const CAMPOS: [keyof CentroImportado, (h: string) => boolean][] = [
  ["localidad", (h) => h.includes("localidad") || h.includes("municipio")],
  ["codigo_centro", (h) => h.includes("codigo")],
  ["telefono", (h) => h.includes("telef")],
  ["email_centro", (h) => h.includes("mail") || h.includes("correo")],
  ["director_nombre", (h) => h.includes("director")],
  ["jefe_estudios_nombre", (h) => h.includes("jefe") || h.includes("jefa")],
  ["secretario_nombre", (h) => h.includes("secretari")],
  ["nombre", (h) => h.includes("nombre") || h.includes("centro") || h.includes("denominacion")],
];

/** Orden por defecto si el Excel no trae cabecera reconocible. */
const ORDEN: (keyof CentroImportado)[] = ["localidad", "nombre", "codigo_centro", "telefono", "email_centro", "director_nombre", "jefe_estudios_nombre", "secretario_nombre"];

export function tipoDesdeNombre(nombre: string): string {
  const n = nombre.trim().toUpperCase();
  // Etiquetas con nombre propio: no se dejan como un genérico «Escuela».
  if (/^ESCUELA DE MUSICA\b/.test(n)) return "Escuela de Música";
  if (/^(CPEE|CEE)\b/.test(n)) return "Educación Especial";
  const m = n.match(/^(IESO|IES|CEIP|CPEI|CEPA|CRA|CC|EI|EEI|CIFP|EOI|CPM|CEI)\b/);
  return m?.[1] ?? "Otro";
}

export function parsearCentros(filas: unknown[][]): CentroImportado[] {
  const limpias = filas.filter((f) => f.some((c) => String(c ?? "").trim()));
  if (!limpias.length) return [];
  let mapa: Partial<Record<keyof CentroImportado, number>> = {};
  const cab = (limpias[0] ?? []).map(norm);
  const usados = new Set<number>();
  for (const [campo, test] of CAMPOS) {
    const i = cab.findIndex((h, idx) => !usados.has(idx) && test(h));
    if (i >= 0) { mapa[campo] = i; usados.add(i); }
  }
  let datos = limpias.slice(1);
  if (mapa.codigo_centro === undefined || mapa.nombre === undefined) {
    mapa = Object.fromEntries(ORDEN.map((k, i) => [k, i]));
    datos = limpias;
  }
  const val = (f: unknown[], k: keyof CentroImportado) => {
    const i = mapa[k];
    const s = i === undefined ? "" : String(f[i] ?? "").trim();
    return s || null;
  };
  const vistos = new Set<string>();
  const out: CentroImportado[] = [];
  for (const f of datos) {
    const codigo = val(f, "codigo_centro");
    const nombre = val(f, "nombre");
    if (!codigo || !nombre || vistos.has(codigo)) continue;
    vistos.add(codigo);
    out.push({
      localidad: val(f, "localidad"), nombre, codigo_centro: codigo,
      telefono: val(f, "telefono"), email_centro: val(f, "email_centro"),
      director_nombre: val(f, "director_nombre"), jefe_estudios_nombre: val(f, "jefe_estudios_nombre"),
      secretario_nombre: val(f, "secretario_nombre"), tipo_centro: tipoDesdeNombre(nombre),
    });
  }
  return out;
}
