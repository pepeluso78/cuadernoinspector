import type { Evento } from "@/lib/queries";

export const esVisita = (evento: Pick<Evento, "tipo_evento">) => evento.tipo_evento === "Visita a Centro";
export const resenaCompleta = (evento: Pick<Evento, "descripcion_visita" | "problemas_visita" | "recomendaciones_visita">) =>
  [evento.descripcion_visita, evento.problemas_visita, evento.recomendaciones_visita].every((texto) => texto.trim().length > 0);
export const nombreArchivoResena = (fechaInicio: string, codigoCentro: string) => {
  const partes = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(fechaInicio));
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `Reseña ${valor("year")}${valor("month")}${valor("day")}-${codigoCentro}.pdf`;
};