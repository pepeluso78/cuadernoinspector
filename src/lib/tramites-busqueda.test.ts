import { describe, expect, it } from "vitest";
import { buscarTramites } from "./tramites-busqueda";
import type { Tramite } from "./queries";

const tramite = (id: string, estado: string, asunto: string, fecha = "2026-10-26"): Tramite => ({
  id, estado, asunto, fecha_entrada: fecha, numero_registro: "NI-468", remitente: "Delegación",
  origen: "Nota Interior", centro_id: null, descripcion_entrada: null, borrador_informe: null,
  correo_id: null, created_at: null, fecha_limite: null, plazo_dias: 10, prioridad: "Media", tipo_actuacion: null,
});
const registros = [
  tramite("pendiente", "Pendiente", "Compensación"),
  tramite("antiguo", "Finalizado", "Compensación de horarios", "2020-01-15"),
  tramite("respondido", "Respondido / Elevado", "Informe de evaluación", "2021-09-01"),
];

describe("Búsquedas independientes de trámites", () => {
  it("encuentra pendientes sin afectar a los finalizados con otra consulta", () => {
    expect(buscarTramites(registros, [], "compensacion", false).map((t) => t.id)).toEqual(["pendiente"]);
    expect(buscarTramites(registros, [], "evaluacion", true).map((t) => t.id)).toEqual(["respondido"]);
  });
  it("encuentra trámites finalizados hace años sin límite de antigüedad", () => {
    expect(buscarTramites(registros, [], "  COMPENSACION   2020  ", true).map((t) => t.id)).toEqual(["antiguo"]);
  });
  it("busca por registro y remitente y recupera todos los cerrados al borrar la consulta", () => {
    expect(buscarTramites(registros, [], "ni-468 delegacion", true).map((t) => t.id)).toEqual(["antiguo", "respondido"]);
    expect(buscarTramites(registros, [], "", true)).toHaveLength(2);
    expect(buscarTramites(registros, [], "inexistente", true)).toHaveLength(0);
  });
});