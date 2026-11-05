import { expect, it } from "vitest";
import { puedeUsarOutlookCompartido } from "./outlook-acceso";

it("solo las cuentas del propietario usan su calendario de Outlook", () => {
  expect(puedeUsarOutlookCompartido("JLMGarcia@jccm.es")).toBe(true);
  expect(puedeUsarOutlookCompartido("pepeluso@gmail.com")).toBe(true);
  expect(puedeUsarOutlookCompartido("jats2001@hotmail.com")).toBe(false);
  expect(puedeUsarOutlookCompartido("")).toBe(false);
});
