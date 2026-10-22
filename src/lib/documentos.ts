export const DOCUMENTOS_BUCKET = "tramites-documentos";
export const CATEGORIAS_DOCUMENTO = ["Alegaciones", "Informe", "Otros documentos"] as const;
export function rutaDocumento(tramiteId: string, id: string, nombre: string) {
  const seguro = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-160) || "documento";
  return `${tramiteId}/${id}/${seguro}`;
}