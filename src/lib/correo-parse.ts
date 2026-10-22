import { calcularFechaLimite, PLAZO_GENERAL, toISODate } from "@/lib/plazos";

export type CorreoEntrada = { asunto: string; cuerpo: string; fecha: Date; remitente: string };

/** Convierte un correo reenviado en los datos de un trámite pendiente. */
export function correoATramite(c: CorreoEntrada) {
  const asunto = c.asunto.replace(/^\s*((RV|RE|FW|FWD|TR)\s*:\s*)+/i, "").trim() || "(Sin asunto)";
  const texto = `${asunto}\n${c.cuerpo}`;
  const esNota = /nota\s+interior/i.test(texto);
  const reclamacion = /reclamaci[oó]n/i.test(asunto);
  const origen = reclamacion ? "Reclamación" : esNota ? "Nota Interior" : "Escrito de Entrada";
  const plazo = reclamacion ? 2 : PLAZO_GENERAL;
  const registro = texto.match(/\b(?:N[ºo°.]?\s*(?:de\s+)?registro|registro)\s*[:.]?\s*([A-Z0-9][A-Z0-9/\-.]{3,})/i)?.[1] ?? null;
  const remOriginal = c.cuerpo.match(/^\s*(?:De|From)\s*:\s*(.+)$/im)?.[1]?.trim();
  const fecha = toISODate(c.fecha);
  return {
    asunto: asunto.slice(0, 300),
    origen,
    tipo_actuacion: esNota ? "Informe Nota Interior" : "Respuesta Escrito",
    numero_registro: registro,
    remitente: remOriginal || c.remitente,
    descripcion_entrada: c.cuerpo.slice(0, 20000),
    fecha_entrada: fecha,
    plazo_dias: plazo,
    fecha_limite: calcularFechaLimite(fecha, plazo),
    estado: "Pendiente",
    prioridad: reclamacion ? "Alta" : "Media",
  };
}
