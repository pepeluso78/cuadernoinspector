import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import {
  allChecklistsQuery,
  centrosQuery,
  checklistsQuery,
  eventosQuery,
  guardiasQuery,
  normativaQuery,
  notasQuery,
  partesQuery,
  tramitesQuery,
  visitasCentroQuery,
} from "@/lib/queries";

const MINUTO = 60_000;
const HORA = 60 * MINUTO;

describe("staleTime de las consultas", () => {
  it("mantiene la normativa 12 horas sin releer", () => {
    expect(normativaQuery.staleTime).toBe(12 * HORA);
  });

  it("mantiene los centros 30 minutos sin releer", () => {
    expect(centrosQuery.staleTime).toBe(30 * MINUTO);
  });

  it("mantiene los trámites 2 minutos sin releer", () => {
    expect(tramitesQuery.staleTime).toBe(2 * MINUTO);
  });

  it("mantiene la documentación de centros 5 minutos sin releer", () => {
    expect(allChecklistsQuery.staleTime).toBe(5 * MINUTO);
    expect(checklistsQuery("c1").staleTime).toBe(5 * MINUTO);
  });

  it("mantiene agenda y guardias 5 minutos sin releer", () => {
    expect(eventosQuery.staleTime).toBe(5 * MINUTO);
    expect(guardiasQuery.staleTime).toBe(5 * MINUTO);
  });

  it("mantiene notas y partes 5 minutos sin releer", () => {
    expect(notasQuery("c1").staleTime).toBe(5 * MINUTO);
    expect(partesQuery("2025-26").staleTime).toBe(5 * MINUTO);
  });

  it("conserva las claves con las que invalidan las mutaciones", () => {
    expect(centrosQuery.queryKey).toEqual(["centros"]);
    expect(tramitesQuery.queryKey).toEqual(["tramites"]);
    expect(eventosQuery.queryKey).toEqual(["eventos"]);
    expect(normativaQuery.queryKey).toEqual(["normativa"]);
    expect(allChecklistsQuery.queryKey).toEqual(["checklists"]);
    expect(guardiasQuery.queryKey).toEqual(["guardias"]);
    expect(partesQuery("2025-26").queryKey).toEqual(["partes", "2025-26"]);
    expect(notasQuery("c1").queryKey).toEqual(["notas", "c1"]);
  });

  it("una invalidación tras guardar vuelve a marcar los datos como obsoletos aunque el staleTime siga vivo", async () => {
    const qc = new QueryClient();
    await qc.prefetchQuery({ ...tramitesQuery, queryFn: async () => [] });
    expect(qc.getQueryState(["tramites"])?.isInvalidated).toBe(false);
    qc.invalidateQueries({ queryKey: ["tramites"] });
    expect(qc.getQueryState(["tramites"])?.isInvalidated).toBe(true);
  });

  it("mantiene las visitas de un centro 5 minutos sin releer", () => {
    expect(visitasCentroQuery("c1").staleTime).toBe(5 * MINUTO);
  });

  it("la lista de visitas de un centro se refresca al guardar una visita desde la agenda", async () => {
    expect(visitasCentroQuery("c1").queryKey).toEqual(["eventos", "c1", "visitas"]);
    const qc = new QueryClient();
    await qc.prefetchQuery({ ...visitasCentroQuery("c1"), queryFn: async () => [] });
    expect(qc.getQueryState(["eventos", "c1", "visitas"])?.isInvalidated).toBe(false);
    qc.invalidateQueries({ queryKey: ["eventos"] });
    expect(qc.getQueryState(["eventos", "c1", "visitas"])?.isInvalidated).toBe(true);
  });
});
