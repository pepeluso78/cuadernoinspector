import { expect, it } from "vitest";
import { CARGOS, PROVINCIAS, CONFIG_INICIAL, configuracionSchema, busquedaCorreo } from "./configuracion";
it("admite los cuatro cargos solicitados", () => {
  expect(CARGOS).toEqual(["Inspector de Educación", "Inspectora de Educación", "Inspector Jefe", "Inspectora Jefa"]);
  expect(configuracionSchema.safeParse({ ...CONFIG_INICIAL, cargo: "Director" }).success).toBe(false);
});
it("admite las cinco delegaciones provinciales", () => {
  expect(PROVINCIAS).toEqual(["Albacete", "Ciudad Real", "Cuenca", "Guadalajara", "Toledo"]);
  expect(configuracionSchema.safeParse({ ...CONFIG_INICIAL, provincia: "Madrid" }).success).toBe(false);
});
it("filtra exclusivamente por el correo configurado y rechaza inyección de búsqueda", () => {
  expect(busquedaCorreo("OTRO@jccm.es")).toBe("from:otro@jccm.es newer_than:30d -in:sent -in:chats");
  expect(() => busquedaCorreo("otro@jccm.es OR from:intruso@example.com")).toThrow();
});