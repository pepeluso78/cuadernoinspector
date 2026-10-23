import { test } from "vitest";
import { expect, it } from "vitest";
import { CARGOS, PROVINCIAS, CONFIG_INICIAL, configuracionSchema, busquedaCorreo } from "./configuracion";
it("un usuario nuevo empieza con los datos personales y el correo en blanco", () => {
  expect(CONFIG_INICIAL.nombre).toBe("");
  expect(CONFIG_INICIAL.apellidos).toBe("");
  expect(CONFIG_INICIAL.correo_referencia).toBe("");
});
it("admite los cuatro cargos solicitados", () => {
  expect(CARGOS).toEqual(["Inspector de Educación", "Inspectora de Educación", "Inspector Jefe", "Inspectora Jefa"]);
  expect(configuracionSchema.safeParse({ ...CONFIG_INICIAL, cargo: "Director" }).success).toBe(false);
});
it("admite las cinco delegaciones provinciales", () => {
  expect(PROVINCIAS).toEqual(["Albacete", "Ciudad Real", "Cuenca", "Guadalajara", "Toledo"]);
  expect(configuracionSchema.safeParse({ ...CONFIG_INICIAL, provincia: "Madrid" }).success).toBe(false);
});
it("filtra exclusivamente por el correo configurado y rechaza inyección de búsqueda", () => {
  expect(busquedaCorreo("OTRO@jccm.es")).toBe(`from:otro@jccm.es (subject:"nota interior" OR subject:entrada) newer_than:30d -in:chats -in:trash -in:spam`);
  expect(() => busquedaCorreo("otro@jccm.es OR from:intruso@example.com")).toThrow();
});
import { asuntoValido, busquedaCorreo as bq } from "./correo-filtro";
test("asuntos NOTA INTERIOR / ENTRADA", () => {
  expect(asuntoValido("NOTA INTERIOR 468: COMPENSACIÓN")).toBe(true);
  expect(asuntoValido("RV: ENTRADA 1234 reclamación")).toBe(true);
  expect(asuntoValido("Reunión de equipo")).toBe(false);
  expect(bq("pepeluso@gmail.com", "pepeluso@gmail.com").startsWith("from:")).toBe(false);
});
