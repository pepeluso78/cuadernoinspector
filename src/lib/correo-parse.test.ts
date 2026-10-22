import { describe, expect, it } from "vitest";
import { correoATramite } from "./correo-parse";

const base = { cuerpo: "texto", fecha: new Date("2026-10-20T10:00:00Z"), remitente: "jl@jccm.es" };

describe("correoATramite", () => {
  it("nota interior: plazo 10 días", () => {
    const t = correoATramite({ ...base, asunto: "RV: Nota Interior sobre horarios" });
    expect(t.origen).toBe("Nota Interior");
    expect(t.asunto).toBe("Nota Interior sobre horarios");
    expect(t.plazo_dias).toBe(10);
  });
  it("reclamación: plazo 2 días", () => {
    const t = correoATramite({ ...base, asunto: "Reclamación de notas" });
    expect(t.origen).toBe("Reclamación");
    expect(t.plazo_dias).toBe(2);
  });
  it("otro correo: escrito de entrada", () => {
    expect(correoATramite({ ...base, asunto: "Solicitud" }).origen).toBe("Escrito de Entrada");
  });
});
