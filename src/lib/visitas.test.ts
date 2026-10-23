import { describe, expect, it } from "vitest";
import { esVisita, nombreArchivoResena, resenaCompleta } from "./visitas";

describe("Registro de visitas", () => {
  it("comparte las visitas del calendario y excluye otros eventos", () => {
    expect(esVisita({ tipo_evento: "Visita a Centro" })).toBe(true);
    expect(esVisita({ tipo_evento: "Vencimiento Trámite" })).toBe(false);
  });
  it("requiere los tres apartados para una reseña completa", () => {
    const datos = { descripcion_visita: "Supervisión de horarios", problemas_visita: "Ninguno", recomendaciones_visita: "Mantener seguimiento" };
    expect(resenaCompleta(datos)).toBe(true);
    for (const campo of Object.keys(datos)) expect(resenaCompleta({ ...datos, [campo]: " " })).toBe(false);
  });
});