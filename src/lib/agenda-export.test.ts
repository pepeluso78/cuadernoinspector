import { describe, expect, it } from "vitest";
import { entradasAgenda, periodoAgenda } from "./agenda-export";

const hoy = new Date(2026, 9, 23, 18, 25);
const evento = (id: string, fecha: string, realizada = false) => ({ id, fecha_inicio: fecha, realizada, titulo: id, centro_id: null, tipo_evento: "Tarea Despacho" });

describe("Impresión del calendario", () => {
  it("incluye todos los eventos del mes visible, también realizados y días adyacentes visibles", () => {
    const eventos = [evento("primero", "2026-09-28T09:00:00"), evento("realizado", "2026-10-23T10:00:00", true), evento("último", "2026-11-01T23:59:00"), evento("fuera", "2026-11-02T00:00:00")];
    expect(entradasAgenda(eventos, [], [], "mes", hoy, hoy).map((e) => e.id)).toEqual(["primero", "realizado", "último"]);
    expect(periodoAgenda("mes", hoy, hoy).dias).toHaveLength(35);
  });
  it("limita la semana visible a lunes-domingo incluyendo guardias", () => {
    const eventos = [evento("antes", "2026-10-18T23:59:00"), evento("lunes", "2026-10-19T00:00:00"), evento("domingo", "2026-10-25T23:59:00"), evento("después", "2026-10-26T00:00:00")];
    const guardias = [{ id: "guardia", fecha: "2026-10-23", persona_nombre: "Persona atendida", centro_id: null, centro_texto: "Centro" }];
    expect(entradasAgenda(eventos, guardias, [], "semana", hoy, hoy).map((e) => e.id)).toEqual(["lunes", "guardia", "domingo"]);
  });
  it("pendientes incluye hoy desde medianoche y futuro sin límite, excluyendo realizados y ayer", () => {
    const eventos = [evento("ayer", "2026-10-22T23:59:00"), evento("hoy", "2026-10-23T00:00:00"), evento("realizado", "2026-10-24T09:00:00", true), evento("futuro", "2028-01-01T12:00:00")];
    expect(entradasAgenda(eventos, [], [], "agenda", new Date(2020, 0, 1), hoy).map((e) => e.id)).toEqual(["hoy", "futuro"]);
  });
});