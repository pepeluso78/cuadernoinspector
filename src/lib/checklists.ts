import { CONFIG_INICIAL, nombreInspector, type Configuracion } from "@/lib/configuracion";
export const CATEGORIAS = [
  "Plan de Mejora",
  "Horarios",
  "PGA",
  "Jefaturas de Departamento",
  "Nombramiento Director y Cargos",
] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const ETIQUETA_CATEGORIA: Record<Categoria, string> = {
  "Plan de Mejora": "Plan de Mejora",
  Horarios: "Horarios",
  PGA: "PGA",
  "Jefaturas de Departamento": "Jefaturas de Departamento",
  "Nombramiento Director y Cargos": "Nombramiento Director/a y Cargos",
};

export type EstadoItem = "Conforme" | "Subsanar" | "Pendiente";
export type ItemChecklist = { texto: string; estado: EstadoItem; obs: string };

export const ITEMS_BASE: Record<Categoria, string[]> = {
  "Plan de Mejora": [
    "Objetivos de mejora definidos, concretos y evaluables",
    "Indicadores de logro establecidos para cada objetivo",
    "Vinculación con los resultados académicos y evaluaciones previas",
    "Responsables y temporalización de las actuaciones",
    "Mecanismos de seguimiento y evaluación del plan",
  ],
  Horarios: [
    "Horario general del centro conforme a la normativa",
    "Horarios individuales del profesorado (lectivas y complementarias)",
    "Horarios de grupos y distribución de áreas/materias",
    "Organización del servicio de guardias",
    "Reducciones horarias (mayores de 55, cargos, coordinaciones) justificadas",
  ],
  PGA: [
    "Coherencia con el Proyecto Educativo y la Memoria del curso anterior",
    "Inclusión de planes y programas del centro",
    "Programa de actividades complementarias y extraescolares",
    "Calendario de evaluaciones y reuniones de órganos",
    "Informe del Claustro y aprobación por la Dirección / Consejo Escolar",
  ],
  "Jefaturas de Departamento": [
    "Nombramientos de jefaturas de departamento realizados en plazo",
    "Horas de dedicación asignadas conforme a la normativa",
    "Libro de actas de departamento actualizado",
    "Programaciones didácticas entregadas y completas",
  ],
  "Nombramiento Director y Cargos": [
    "Vigencia del mandato del Director/a comprobada",
    "Previsión de renovación o convocatoria de selección",
    "Nombramiento de Jefatura de Estudios conforme",
    "Nombramiento de Secretaría conforme",
    "Otros cargos y coordinaciones nombrados y comunicados",
  ],
};

export function itemsIniciales(cat: Categoria): ItemChecklist[] {
  return ITEMS_BASE[cat].map((texto) => ({ texto, estado: "Pendiente", obs: "" }));
}

export function estadoGlobal(items: ItemChecklist[]): string {
  if (items.some((i) => i.estado === "Subsanar")) return "Requiere subsanación";
  if (items.length && items.every((i) => i.estado === "Conforme")) return "Conforme";
  if (items.some((i) => i.estado === "Conforme")) return "En revisión";
  return "Pendiente";
}

export function generarRequerimiento(
  centro: { nombre: string; codigo_centro: string },
  cat: Categoria,
  items: ItemChecklist[],
  observaciones: string,
  tipo: "requerimiento" | "acta",
  config: Configuracion = CONFIG_INICIAL,
): string {
  const fecha = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const subsanar = items.filter((i) => i.estado === "Subsanar");
  const conformes = items.filter((i) => i.estado === "Conforme");
  const pendientes = items.filter((i) => i.estado === "Pendiente");
  const linea = (i: ItemChecklist, n: number) => `${n + 1}. ${i.texto}${i.obs ? ` — ${i.obs}` : ""}`;
  const cab = `DELEGACIÓN PROVINCIAL DE EDUCACIÓN, CULTURA Y DEPORTES DE ${config.provincia.toLocaleUpperCase("es")}\nServicio de Inspección de Educación\n\n`;
  if (tipo === "requerimiento") {
    return `${cab}ASUNTO: Requerimiento de subsanación — ${ETIQUETA_CATEGORIA[cat]}\nCENTRO: ${centro.nombre} (${centro.codigo_centro})\n\nEn el ejercicio de las funciones atribuidas a la Inspección de Educación por el artículo 151 de la Ley Orgánica 2/2006, de Educación, y el Decreto 34/2008, de 26 de febrero, tras la supervisión realizada se REQUIERE a la Dirección del centro la subsanación de los siguientes aspectos:\n\n${subsanar.length ? subsanar.map(linea).join("\n") : "(No se han detectado aspectos a subsanar)"}\n\n${observaciones ? `Observaciones: ${observaciones}\n\n` : ""}Deberá remitir la documentación corregida a esta Inspección en el plazo de 10 días hábiles.\n\n${config.provincia}, ${fecha}\n\n${config.cargo}\nFdo.: ${nombreInspector(config)}`;
  }
  return `${cab}ACTA DE SUPERVISIÓN — ${ETIQUETA_CATEGORIA[cat]}\nCENTRO: ${centro.nombre} (${centro.codigo_centro})\nFECHA: ${fecha}\n\nASPECTOS CONFORMES:\n${conformes.map(linea).join("\n") || "—"}\n\nASPECTOS A SUBSANAR:\n${subsanar.map(linea).join("\n") || "—"}\n\nASPECTOS PENDIENTES DE REVISIÓN:\n${pendientes.map(linea).join("\n") || "—"}\n\n${observaciones ? `OBSERVACIONES DEL INSPECTOR:\n${observaciones}\n\n` : ""}${config.cargo}\nFdo.: ${nombreInspector(config)}`;
}
