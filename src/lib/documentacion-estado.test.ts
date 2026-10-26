import { expect, it } from "vitest";
import { documentoPresentado } from "./documentacion-estado";

it("marca solo el documento pulsado como presentado sin sobrescribir observaciones", () => {
  const cambio = documentoPresentado("centro-1", "2026/2027", "PGA");
  expect(cambio).toEqual({ centro_id: "centro-1", curso_escolar: "2026/2027", categoria: "PGA", estado_global: "Presentado" });
  expect({ observaciones_inspector: "Revisar anexo", ...cambio }.observaciones_inspector).toBe("Revisar anexo");
});