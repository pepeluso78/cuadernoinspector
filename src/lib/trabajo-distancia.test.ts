import { describe, expect, it } from "vitest";
import { esDiaGuardia, esTrabajoDistancia } from "./trabajo-distancia";

describe("Trabajo a Distancia", () => {
  it("marca el día elegido dentro del curso", () => {
    expect(esTrabajoDistancia(new Date(2026, 8, 2), 3)).toBe(true); // mié 2-sep-2026
    expect(esTrabajoDistancia(new Date(2026, 8, 3), 3)).toBe(false);
  });
  it("incluye el 15 de julio y excluye del 16 de julio al 31 de agosto", () => {
    expect(esTrabajoDistancia(new Date(2027, 6, 15), 4)).toBe(true); // jue
    expect(esTrabajoDistancia(new Date(2027, 6, 22), 4)).toBe(false);
    expect(esTrabajoDistancia(new Date(2026, 7, 26), 3)).toBe(false);
  });
  it("guardia semanal con cambio o anulación de una semana", () => {
    expect(esDiaGuardia(new Date(2026, 8, 17), 4, {})).toBe(true); // jue 17-sep
    const cambios = { "2026-09-14": "2026-09-15", "2026-09-21": null };
    expect(esDiaGuardia(new Date(2026, 8, 17), 4, cambios)).toBe(false);
    expect(esDiaGuardia(new Date(2026, 8, 15), 4, cambios)).toBe(true);
    expect(esDiaGuardia(new Date(2026, 8, 24), 4, cambios)).toBe(false);
    expect(esDiaGuardia(new Date(2026, 9, 1), 4, cambios)).toBe(true);
  });
  it("no marca festivos", () => {
    expect(esTrabajoDistancia(new Date(2026, 8, 8), 2)).toBe(false); // mar 8-sep festivo Albacete
  });
});
