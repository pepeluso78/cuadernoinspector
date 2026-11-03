import { describe, expect, it } from "vitest";
import { ordenarCentros } from "./orden-centros";

describe("ordenarCentros", () => {
  it("ordena IES/IESO, CEIP, CC, CRA, educación especial, EI y el resto al final", () => {
    const ordenado = ordenarCentros([
      { nombre: "EI Sanchica", tipo_centro: "EI" },
      { nombre: "CRA La Mancha", tipo_centro: "CRA" },
      { nombre: "CEIP Cervantes", tipo_centro: "CEIP" },
      { nombre: "Conservatorio Superior", tipo_centro: "Conservatorio" },
      { nombre: "IESO Doctor Alarcón", tipo_centro: "IESO" },
      { nombre: "CC Aristos", tipo_centro: "CC" },
      { nombre: "IES Bachiller Sabuco", tipo_centro: "IES" },
      { nombre: "Centro Asprona Infanta Elena", tipo_centro: "Educación Especial" },
      { nombre: "Escuela de Música Moderna", tipo_centro: "Escuela de Música" },
    ]);
    expect(ordenado.map((c) => c.tipo_centro)).toEqual([
      "IES", "IESO", "CEIP", "CC", "CRA", "Educación Especial", "EI", "Conservatorio", "Escuela de Música",
    ]);
  });

  it("pone los concertados y la educación especial antes que las escuelas infantiles", () => {
    const ordenado = ordenarCentros([
      { nombre: "EI Colorines", tipo_centro: "EI" },
      { nombre: "CC Aristos", tipo_centro: "CC" },
      { nombre: "Centro Asprona", tipo_centro: "Educación Especial" },
      { nombre: "CPEI Bambini", tipo_centro: "CPEI" },
    ]);
    expect(ordenado.map((c) => c.tipo_centro)).toEqual([
      "CC", "Educación Especial", "CPEI", "EI",
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
    expect(original[0]?.nombre).toBe("Centro B");
  });
});
