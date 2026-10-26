import type { Categoria } from "./checklists";

export function documentoPresentado(centroId: string, curso: string, categoria: Categoria) {
  return { centro_id: centroId, curso_escolar: curso, categoria, estado_global: "Presentado" as const };
}