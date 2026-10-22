import { describe, expect, it } from "vitest";
import { adjuntosCorreo, decodificarAdjunto, leerRespuestaBatch } from "./correo-adjuntos";

describe("documentos del correo", () => {
  it("importa todos los adjuntos, incluso los anidados y los incluidos en el cuerpo MIME", () => {
    const result = adjuntosCorreo({ parts: [
      { mimeType: "text/plain", body: { data: "dGV4dG8=" } },
      { partId: "1", filename: "alegaciones.pdf", body: { attachmentId: "pdf" } },
      { parts: [{ partId: "2.0", filename: "informe.docx", body: { data: "AAH_" } }] },
    ] });
    expect(result.map((r) => [r.filename, r.clave])).toEqual([["alegaciones.pdf", "1"], ["informe.docx", "2.0"]]);
  });
  it("conserva los bytes binarios del archivo", () => {
    expect([...decodificarAdjunto("AAH_")]).toEqual([0, 1, 255]);
  });
  it("conserva tanto resultados correctos como errores individuales de Gmail", () => {
    const body = '--test\r\nContent-ID: <response-a>\r\n\r\nHTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{"id":"a"}\r\n--test\r\nContent-ID: <response-b>\r\n\r\nHTTP/1.1 403 Forbidden\r\nContent-Type: application/json\r\n\r\n{"error":"denied"}\r\n--test--';
    expect(leerRespuestaBatch("multipart/mixed; boundary=test", body)).toEqual([
      { id: "a", status: 200, data: { id: "a" } }, { id: "b", status: 403, data: { error: "denied" } },
    ]);
  });
});