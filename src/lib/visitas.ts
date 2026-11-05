import type { Evento } from "@/lib/queries";

export const esVisita = (evento: Pick<Evento, "tipo_evento">) => evento.tipo_evento === "Visita a Centro";
export const resenaCompleta = (evento: Pick<Evento, "descripcion_visita" | "problemas_visita" | "recomendaciones_visita">) =>
  [evento.descripcion_visita, evento.problemas_visita, evento.recomendaciones_visita].every((texto) => texto.trim().length > 0);
/**
 * Identificativo que va tras la fecha en el nombre del PDF: el código del centro
 * y, si el centro no está en la lista y no tiene código, su nombre sin acentos.
 */
export const codigoEnArchivo = (codigoCentro: string, nombreCentro: string) => {
  const base = (codigoCentro.trim() || nombreCentro.trim())
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "SIN-CODIGO";
};
export const nombreArchivoResena = (fechaInicio: string, codigoCentro: string) => {
  const partes = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(fechaInicio));
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `Reseña ${valor("year")}${valor("month")}${valor("day")}-${codigoCentro}.pdf`;
};