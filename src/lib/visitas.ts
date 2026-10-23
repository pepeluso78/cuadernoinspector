import type { Evento } from "@/lib/queries";

export const esVisita = (evento: Pick<Evento, "tipo_evento">) => evento.tipo_evento === "Visita a Centro";
export const resenaCompleta = (evento: Pick<Evento, "descripcion_visita" | "problemas_visita" | "recomendaciones_visita">) =>
  [evento.descripcion_visita, evento.problemas_visita, evento.recomendaciones_visita].every((texto) => texto.trim().length > 0);