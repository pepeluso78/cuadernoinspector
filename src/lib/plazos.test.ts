import { describe, it, expect } from "vitest";
import { calcularFechaLimite, diasRestantes, semaforo, esLectivo, parseISODate } from "./plazos";

describe("plazos de trámites (días lectivos)", () => {
  it("por defecto suma 10 días lectivos saltando fines de semana", () => {
    // entrada jueves 22 oct 2026 → 23, 26-30 oct, 2-5 nov (1 nov es domingo)
    expect(calcularFechaLimite("2026-10-22")).toBe("2026-11-05");
  });
  it("reclamación urgente: 2 días lectivos", () => {
    // jueves 22 oct → viernes 23 y lunes 26
    expect(calcularFechaLimite("2026-10-22", 2)).toBe("2026-10-26");
  });
  it("expedientes de 30 días lectivos cruzan de mes", () => {
    expect(calcularFechaLimite("2026-10-22", 30)).toBe("2026-12-03");
  });
  it("no cuenta el festivo local de Albacete del 8 de septiembre", () => {
    // entrada lunes 7 sep 2026, 2 días: 8 sep festivo → 9 y 10 sep
    expect(calcularFechaLimite("2026-09-07", 2)).toBe("2026-09-10");
  });
  it("no cuenta el 24 de junio, festivo local de Albacete", () => {
    expect(esLectivo(parseISODate("2027-06-24"))).toBe(false);
  });
  it("cuenta días lectivos restantes", () => {
    // del jueves 22 al lunes 26 oct: quedan 23 y 26 → 2
    expect(diasRestantes("2026-10-26", new Date(2026, 9, 22))).toBe(2);
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
