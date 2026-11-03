// Conversión entre los compromisos del calendario de Outlook (Microsoft Graph)
// y las filas de agenda_eventos. Módulo sin dependencias del navegador.
import { TIPO_OUTLOOK } from "./constants";

export type EventoOutlook = {
  id: string;
  subject?: string | null;
  allDay?: boolean;
  start: { dateTime: string; timeZone: string };
  end?: { dateTime: string; timeZone: string } | null;
  locations?: { displayName?: string | null }[] | null;
  bodyPreview?: string | null;
  "@odata.type"?: string;
};

const MADRID = "Europe/Madrid";
const HORA = 3_600_000;

// Zonas horarias de Microsoft Graph que aparecen en cuentas de España.
// Las no conocidas se leen como hora de Madrid: es la zona de quien usa la app.
const ZONAS: Record<string, string> = {
  "romance standard time": MADRID,
  "w. europe standard time": MADRID,
  "central european standard time": MADRID,
  "central europe standard time": MADRID,
  "gmt standard time": "UTC",
  "utc standard time": "UTC",
  utc: "UTC",
  gmt: "UTC",
};

/** Último domingo del mes (mes 0-indexado) como ms UTC de medianoche. */
function ultimoDomingo(año: number, mes: number): number {
  const ultimoDia = Date.UTC(año, mes + 1, 0);
  return ultimoDia - new Date(ultimoDia).getUTCDay() * 86_400_000;
}

/**
 * España peninsular: el horario de verano empieza el último domingo de marzo
 * a las 01:00 UTC y termina el último domingo de octubre a las 02:00 UTC.
 */
function enHorarioDeVerano(utcMs: number): boolean {
  const año = new Date(utcMs).getUTCFullYear();
  return utcMs >= ultimoDomingo(año, 2) + HORA && utcMs < ultimoDomingo(año, 9) + 2 * HORA;
}

/** Hora local de un calendario de Outlook → marca ISO en UTC. */
export function fechaOutlookAISO(fecha: { dateTime: string; timeZone: string } | null | undefined): string | null {
  if (!fecha?.dateTime) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(fecha.dateTime);
  if (!m) return null;
  const local = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], m[6] ? +m[6] : 0);
  if ((ZONAS[fecha.timeZone.toLowerCase()] ?? MADRID) === "UTC") return new Date(local).toISOString();
  // Con la hora normal (+1) la marca UTC sería esta; si cae en verano, son dos horas.
  return new Date(local - (enHorarioDeVerano(local - HORA) ? 2 * HORA : HORA)).toISOString();
}

export type FilaAgendaDesdeOutlook = {
  titulo: string;
  tipo_evento: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  notas_visita: string | null;
  outlook_id: string;
};

/** Compromiso de Outlook → fila lista para insertar en agenda_eventos. */
export function filaDesdeEventoOutlook(ev: EventoOutlook): FilaAgendaDesdeOutlook | null {
  const fecha_inicio = fechaOutlookAISO(ev.start);
  if (!fecha_inicio) return null;
  const partes: string[] = [];
  const lugar = ev.locations?.find((l) => l.displayName)?.displayName?.trim();
  if (lugar) partes.push(`Lugar: ${lugar}`);
  const cuerpo = ev.bodyPreview?.trim();
  if (cuerpo) partes.push(cuerpo);
  return {
    titulo: ev.subject?.trim() || "(Sin asunto)",
    tipo_evento: TIPO_OUTLOOK,
    fecha_inicio,
    fecha_fin: fechaOutlookAISO(ev.end),
    notas_visita: partes.length ? partes.join("\n") : null,
    outlook_id: ev.id,
  };
}

export function esEventoCancelado(ev: Pick<EventoOutlook, "@odata.type">): boolean {
  return ev["@odata.type"] === "#microsoft.graph.cancelledEvent";
}

const relojMadrid = new Intl.DateTimeFormat("sv-SE", {
  timeZone: MADRID, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

/** Marca UTC → «yyyy-MM-ddTHH:mm:ss» con la hora de Madrid. */
export function horaMadrid(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) throw new Error(`Fecha no válida: ${iso}`);
  const partes: Record<string, string> = {};
  for (const p of relojMadrid.formatToParts(fecha)) partes[p.type] = p.value;
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}:${partes.second}`;
}

export type CuerpoEventoOutlook = {
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  body: { contentType: string; content: string };
  categories: string[];
};

/** Evento de la agenda → compromiso que Outlook entiende (hora local de Madrid). */
export function cuerpoEventoOutlook(e: {
  titulo: string;
  fecha_inicio: string;
  fecha_fin?: string | null;
  notas_visita?: string | null;
}): CuerpoEventoOutlook {
  const inicio = new Date(e.fecha_inicio);
  if (Number.isNaN(inicio.getTime())) throw new Error(`Fecha no válida: ${e.fecha_inicio}`);
  const fin = e.fecha_fin ? new Date(e.fecha_fin) : new Date(inicio.getTime() + HORA);
  const finValido = Number.isNaN(fin.getTime()) || fin <= inicio ? new Date(inicio.getTime() + HORA) : fin;
  return {
    subject: e.titulo,
    start: { dateTime: horaMadrid(inicio.toISOString()), timeZone: MADRID },
    end: { dateTime: horaMadrid(finValido.toISOString()), timeZone: MADRID },
    body: { contentType: "text", content: e.notas_visita ?? "" },
    categories: ["SIE-CLM"],
  };
}
