import { describe, expect, it } from "vitest";
import { ordenarCentros } from "./orden-centros";

describe("ordenarCentros", () => {
  it("ordena IES/IESO, CEIP, CC, CRA, EI y el resto al final", () => {
    const ordenado = ordenarCentros([
      { nombre: "Escuela Infantil Ana", tipo_centro: "EI" },
      { nombre: "CRA La Mancha", tipo_centro: "CRA" },
      { nombre: "CEIP Cervantes", tipo_centro: "CEIP" },
      { nombre: "Conservatorio Superior", tipo_centro: "Conservatorio" },
      { nombre: "IESO Doctor Alarcón", tipo_centro: "IESO" },
      { nombre: "CC Aristos", tipo_centro: "CC" },
      { nombre: "IES Bachiller Sabuco", tipo_centro: "IES" },
    ]);
    expect(ordenado.map((c) => c.tipo_centro)).toEqual([
      "IES", "IESO", "CEIP", "CC", "CRA", "EI", "Conservatorio",
    ]);
  });

  it("ordena por nombre dentro del mismo tipo", () => {
    const ordenado = ordenarCentros([
      { nombre: "CEIP Zorrilla", tipo_centro: "CEIP" },
      { nombre: "CEIP Anton Diaz", tipo_centro: "CEIP" },
    ]);
    expect(ordenado.map((c) => c.nombre)).toEqual(["CEIP Anton Diaz", "CEIP Zorrilla"]);
  });

  it("no falla con tipo vacío y no muta la lista original", () => {
    const original = [
      { nombre: "Centro B", tipo_centro: null },
      { nombre: "Centro A", tipo_centro: "EI" },
    ];
    const ordenado = ordenarCentros(original);
    expect(ordenado.map((c) => c.nombre)).toEqual(["Centro A", "Centro B"]);
    expect(original[0].nombre).toBe("Centro B");
  });
});
