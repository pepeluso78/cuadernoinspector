import { describe, expect, it } from "vitest";
import {
  cuerpoEventoOutlook,
  esEventoCancelado,
  fechaOutlookAISO,
  filaDesdeEventoOutlook,
  horaMadrid,
} from "./outlook-mapping";

describe("fechaOutlookAISO", () => {
  it("pasa una hora de verano de Madrid a UTC", () => {
    expect(fechaOutlookAISO({ dateTime: "2026-06-15T09:00:00.0000000", timeZone: "Romance Standard Time" })).toBe("2026-06-15T07:00:00.000Z");
  });
  it("pasa una hora de invierno de Madrid a UTC", () => {
    expect(fechaOutlookAISO({ dateTime: "2026-11-15T09:00:00.0000000", timeZone: "Romance Standard Time" })).toBe("2026-11-15T08:00:00.000Z");
  });
  it("respeta los calendarios que llegan en UTC", () => {
    expect(fechaOutlookAISO({ dateTime: "2026-11-15T09:00:00.0000000", timeZone: "UTC" })).toBe("2026-11-15T09:00:00.000Z");
  });
  it("no devuelve nada si Outlook no trae hora", () => {
    expect(fechaOutlookAISO(undefined)).toBeNull();
  });
});

describe("filaDesdeEventoOutlook", () => {
  it("traduce un compromiso de Outlook a fila de agenda", () => {
    const fila = filaDesdeEventoOutlook({
      id: "AQMkADAwAT==",
      subject: "Reunión del IES",
      start: { dateTime: "2026-11-15T09:00:00.0000000", timeZone: "Romance Standard Time" },
      end: { dateTime: "2026-11-15T10:30:00.0000000", timeZone: "Romance Standard Time" },
      locations: [{ displayName: "Salón de actos" }],
      bodyPreview: "Orden del día",
    });
    expect(fila).toMatchObject({
      titulo: "Reunión del IES",
      tipo_evento: "Compromiso Outlook",
      outlook_id: "AQMkADAwAT==",
      fecha_inicio: "2026-11-15T08:00:00.000Z",
      fecha_fin: "2026-11-15T09:30:00.000Z",
      notas_visita: "Lugar: Salón de actos\nOrden del día",
    });
  });
  it("pone un título provisional cuando Outlook no trae asunto", () => {
    const fila = filaDesdeEventoOutlook({ id: "x", subject: "  ", start: { dateTime: "2026-11-15T09:00:00", timeZone: "Romance Standard Time" } });
    expect(fila?.titulo).toBe("(Sin asunto)");
    expect(fila?.notas_visita).toBeNull();
  });
  it("detecta los compromisos cancelados", () => {
    expect(esEventoCancelado({ "@odata.type": "#microsoft.graph.cancelledEvent" })).toBe(true);
    expect(esEventoCancelado({})).toBe(false);
  });
});

describe("cuerpoEventoOutlook", () => {
  it("devuelve la hora local de Madrid y una hora de duración por defecto", () => {
    const cuerpo = cuerpoEventoOutlook({ titulo: "Visita al CEIP", fecha_inicio: "2026-06-15T07:00:00.000Z" });
    expect(cuerpo.start).toEqual({ dateTime: "2026-06-15T09:00:00", timeZone: "Europe/Madrid" });
    expect(cuerpo.end.dateTime).toBe("2026-06-15T10:00:00");
    expect(cuerpo.categories).toEqual(["SIE-CLM"]);
  });
  it("alarga el evento cuando la hora de fin no es posterior", () => {
    const cuerpo = cuerpoEventoOutlook({ titulo: "X", fecha_inicio: "2026-06-15T07:00:00.000Z", fecha_fin: "2026-06-15T07:00:00.000Z" });
    expect(cuerpo.end.dateTime).toBe("2026-06-15T10:00:00");
  });
  it("respeta la duración indicada por la agenda", () => {
    const cuerpo = cuerpoEventoOutlook({ titulo: "X", fecha_inicio: "2026-11-15T08:00:00.000Z", fecha_fin: "2026-11-15T10:30:00.000Z" });
    expect(cuerpo.end.dateTime).toBe("2026-11-15T11:30:00");
  });
});

describe("horaMadrid", () => {
  it("convierte medianoche UTC en las dos de la madrugada de Madrid en verano", () => {
    expect(horaMadrid("2026-06-15T00:00:00.000Z")).toBe("2026-06-15T02:00:00");
  });
});
