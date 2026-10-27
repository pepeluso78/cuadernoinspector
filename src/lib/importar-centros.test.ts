import { describe, expect, it } from "vitest";
import { parsearCentros } from "./importar-centros";

describe("parsearCentros", () => {
  it("lee columnas por cabecera en el orden indicado", () => {
    const r = parsearCentros([
      ["Localidad", "Nombre centro", "Código", "Teléfono", "Email", "Director/a", "Jefe/a de estudios", "Secretario/a"],
      ["Albacete", "IES Tomás Navarro", "02000477", "967000000", "ies@jccm.es", "Ana", "Luis", "Eva"],
    ]);
    expect(r[0]).toMatchObject({ localidad: "Albacete", codigo_centro: "02000477", director_nombre: "Ana", jefe_estudios_nombre: "Luis", secretario_nombre: "Eva", tipo_centro: "IES" });
  });
  it("sin cabecera usa el orden localidad, nombre, código", () => {
    const r = parsearCentros([["Hellín", "CEIP La Olivarera", "02001111"]]);
    expect(r[0]).toMatchObject({ localidad: "Hellín", nombre: "CEIP La Olivarera", codigo_centro: "02001111", tipo_centro: "CEIP" });
  });
  it("omite filas sin código y códigos repetidos", () => {
    const r = parsearCentros([["Localidad", "Nombre", "Código"], ["A", "EI Uno", "1"], ["A", "EI Dos", ""], ["A", "EI Tres", "1"]]);
    expect(r).toHaveLength(1);
  });
});
