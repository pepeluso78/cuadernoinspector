// Llamadas al calendario de Outlook a través de la pasarela de conexiones.
// Solo de servidor: las credenciales se leen dentro de cada función.
import type { EventoOutlook } from "./outlook-mapping";

const PASARELA = "https://connector-gateway.lovable.dev/microsoft_outlook";

type Opciones = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, string | number>;
  body?: unknown;
};

async function graph<T>(ruta: string, op: Opciones = {}): Promise<T> {
  const api = process.env["LOVABLE_API_KEY"];
  const conexion = process.env["MICROSOFT_OUTLOOK_API_KEY"];
  if (!api || !conexion) throw new Error("La conexión con Outlook no está disponible en este entorno");
  const url = new URL(PASARELA + ruta);
  for (const [clave, valor] of Object.entries(op.query ?? {})) url.searchParams.set(clave, String(valor));
  const respuesta = await fetch(url, {
    method: op.method ?? "GET",
    headers: {
      Authorization: `Bearer ${api}`,
      "X-Connection-Api-Key": conexion,
      ...(op.body ? { "Content-Type": "application/json" } : {}),
    },
    body: op.body ? JSON.stringify(op.body) : undefined,
  });
  if (!respuesta.ok) {
    const detalle = (await respuesta.text()).slice(0, 300);
    throw new Error(`Outlook ha respondido ${respuesta.status}: ${detalle}`);
  }
  if (respuesta.status === 204) return undefined as T;
  return (await respuesta.json()) as T;
}

/** Compromisos del calendario principal entre dos marcas (ambas en UTC). */
export async function listarEventosOutlook(desde: Date, hasta: Date): Promise<EventoOutlook[]> {
  const respuesta = await graph<{ value?: EventoOutlook[] }>("/me/calendarView", {
    query: {
      startDateTime: desde.toISOString(),
      endDateTime: hasta.toISOString(),
      $orderby: "start/dateTime",
      $top: 100,
      $select: "id,subject,start,end,allDay,locations,bodyPreview",
    },
  });
  return respuesta.value ?? [];
}

/** Crea un compromiso en el calendario principal y devuelve su identificador. */
export async function crearEventoOutlook(cuerpo: unknown): Promise<{ id: string } | null> {
  return await graph<{ id: string }>("/me/events", { method: "POST", body: cuerpo });
}

/** Quita un compromiso creado por la app del calendario de Outlook. */
export async function borrarEventoOutlook(id: string): Promise<void> {
  await graph<void>(`/me/events/${encodeURIComponent(id)}`, { method: "DELETE" });
}
