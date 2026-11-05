import { describe, expect, it } from "vitest";
import { OTRO_CENTRO, centroTextoGuardado, fichaCentroEvento, nombreCentroEvento } from "./centro-evento";

const centros = [
  { id: "c1", nombre: "IES Abad Donas", codigo_centro: "02007321", localidad: "Albacete" },
  { id: "c2", nombre: "CEIP Anton Diaz", codigo_centro: "02004813", localidad: "Chinchilla" },
];

describe("Centro de un evento de agenda", () => {
  it("usa el nombre de la lista cuando el centro está seleccionado", () => {
    expect(nombreCentroEvento({ centro_id: "c2", centro_texto: "" }, centros)).toBe("CEIP Anton Diaz");
    expect(fichaCentroEvento({ centro_id: "c2", centro_texto: "" }, centros)).toEqual({
      nombre: "CEIP Anton Diaz", codigo_centro: "02004813", localidad: "Chinchilla", externo: false,
    });
  });
  it("usa el nombre escrito a mano cuando el centro no está en la lista", () => {
    const evento = { centro_id: null, centro_texto: "CPA Virgen de la Cabella" };
    expect(nombreCentroEvento(evento, centros)).toBe("CPA Virgen de la Cabella");
    expect(fichaCentroEvento(evento, centros)).toEqual({
      nombre: "CPA Virgen de la Cabella", codigo_centro: "", localidad: "", externo: true,
    });
  });
  it("no tiene centro si no hay selección ni texto escrito", () => {
    expect(nombreCentroEvento({ centro_id: null, centro_texto: "   " }, centros)).toBe("");
    expect(fichaCentroEvento({ centro_id: null, centro_texto: "   " }, centros)).toBeNull();
  });
  it("guarda el texto escrito solo mientras no se elige un centro de la lista", () => {
    expect(centroTextoGuardado({ centro_id: null, centro_texto: "  Centro Ajeno  " })).toBe("Centro Ajeno");
    expect(centroTextoGuardado({ centro_id: "c1", centro_texto: "Centro Ajeno" })).toBe("");
  });
  it("la opción OTRO no coincide con ningún id de centro", () => {
    expect(centros.some((c) => c.id === OTRO_CENTRO)).toBe(false);
  });
});
