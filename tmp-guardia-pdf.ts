import { crearGuardiaPDF, nombreArchivoGuardia, type Guardia } from "./src/lib/guardia-pdf";

const orig = globalThis.fetch;
globalThis.fetch = ((u: any, o?: any) =>
  orig(typeof u === "string" && u.startsWith("/") ? "http://localhost:8080" + u : u, o)) as any;

const base = {
  id: "00000000-0000-0000-0000-000000000000",
  created_at: "2026-10-23T10:00:00Z",
  fecha: "2026-10-23",
  persona_nombre: "María López Ruiz",
  persona_condicion: "Madre de alumno de 3º de Primaria",
  persona_contacto: "600 123 456",
  modalidad: "Teléfono",
  inspector_guardia: "José Luis Martínez García",
  cargo_guardia: "Inspector de Educación",
  provincia_guardia: "Albacete",
  inspector_centro: "Ana Gómez Serrán",
  centro_id: null,
  centro_texto: "CEIP Anton Díaz",
} as unknown as Guardia;

const larga =
  "La familia consulta su disconformidad con la valoración de la sesión de evaluación del tercer trimestre y con las medidas de apoyo adoptadas para su hijo. Explica que en las dos últimas semanas el alumno ha faltado al centro por motivos de salud y que no ha recibido material de refuerzo en casa. Solicita que se revise la decisión del equipo docente y que se le informe de los cauces de reclamación disponibles. " +
  "Se le indica que el centro dispone de un plan de refuerzo y que la familia puede solicitar una reunión con la tutora y con el equipo directivo.";

const casos: [string, Guardia, string][] = [
  ["corta", { ...base, incidencia: "Consulta telefónica de la familia sobre el procedimiento de reclamación de notas." }, "CEIP Anton Díaz"],
  ["larga", { ...base, incidencia: larga, respuesta: larga }, "CEIP Anton Díaz"],
];


for (const [nombre, g, centro] of casos) {
  const bytes = await crearGuardiaPDF(g, centro);
  await Bun.write(`/tmp/browser/guardia-${nombre}.pdf`, bytes);
  console.log("ok", nombre, nombreArchivoGuardia(g.fecha), bytes.length);
}
