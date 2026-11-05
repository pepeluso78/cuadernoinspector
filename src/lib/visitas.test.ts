import { describe, expect, it } from "vitest";
import { codigoEnArchivo, esVisita, nombreArchivoResena, resenaCompleta } from "./visitas";

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
  it("nombra el PDF con la ñ y el formato Reseña AAAMMDD-código", () => {
    expect(nombreArchivoResena("2026-10-23T12:00:00Z", "02007321")).toBe("Reseña 20261023-02007321.pdf");
    expect(nombreArchivoResena("2026-10-23T23:30:00Z", "02007321")).toBe("Reseña 20261024-02007321.pdf");
  });
  it("usa el código del centro y, si no lo tiene, su nombre en el nombre del PDF", () => {
    expect(codigoEnArchivo("02007321", "IES Abad Donas")).toBe("02007321");
    expect(codigoEnArchivo("", "CPA Virgen de la Cabella")).toBe("CPA-Virgen-de-la-Cabella");
    expect(codigoEnArchivo("", "Escuela de Música Moderna")).toBe("Escuela-de-Musica-Moderna");
    expect(codigoEnArchivo("", "  ")).toBe("SIN-CODIGO");
  });
});