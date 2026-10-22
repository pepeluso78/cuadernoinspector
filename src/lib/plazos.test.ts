import { describe, it, expect } from "vitest";
import { calcularFechaLimite, diasRestantes, semaforo } from "./plazos";

describe("plazos de trámites", () => {
  it("por defecto suma 10 días a la fecha de entrada", () => {
    expect(calcularFechaLimite("2026-10-22")).toBe("2026-11-01");
  });
  it("reclamación urgente: 2 días", () => {
    expect(calcularFechaLimite("2026-10-22", 2)).toBe("2026-10-24");
  });
  it("expedientes de 30 días cruzan de mes", () => {
    expect(calcularFechaLimite("2026-10-22", 30)).toBe("2026-11-21");
  });
  it("cuenta días restantes", () => {
    expect(diasRestantes("2026-10-25", new Date(2026, 9, 22))).toBe(3);
  });
  it("semáforo: rojo hoy o vencido", () => {
    expect(semaforo(0)).toBe("rojo");
    expect(semaforo(-2)).toBe("rojo");
  });
  it("semáforo: amarillo entre 1 y 3 días", () => {
    expect(semaforo(1)).toBe("amarillo");
    expect(semaforo(3)).toBe("amarillo");
  });
  it("semáforo: verde con 4 o más días", () => {
    expect(semaforo(4)).toBe("verde");
  });
});
