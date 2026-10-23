import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, Minus, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { centrosQuery, partesQuery, type Centro, type ParteAusencias } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/partes")({
  head: () => ({ meta: [{ title: "Partes de Ausencias · SIE-CLM" }, { name: "description", content: "Control mensual de los partes de ausencias del personal, de septiembre a junio." }, { property: "og:title", content: "Partes de Ausencias · SIE-CLM" }, { property: "og:description", content: "Control mensual de los partes de ausencias del personal, de septiembre a junio." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: PartesPage,
});

const CURSO = "2026/2027";
const MESES = ["Septiembre", "Octubre", "Noviembre", "Diciembre", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio"] as const;

function PartesPage() {
  const { data: todos = [] } = useQuery(centrosQuery);
  const { data: partes = [] } = useQuery(partesQuery(CURSO));
  const [sel, setSel] = useState<string | null>(null);
  const [configurar, setConfigurar] = useState(false);
  const centros = todos.filter((c) => c.supervisa_partes);
  const centroSel = centros.find((c) => c.id === sel) ?? centros[0];

  return (
    <div>
      <PageHeader eyebrow={`Módulo 6 · Curso ${CURSO}`} title="Partes de Ausencias">
        <p className="text-sm text-muted-foreground">Pulsa una celda para marcar o desmarcar el parte del mes.</p>
      </PageHeader>
      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setConfigurar((v) => !v)}>
          <Settings2 className="mr-1.5 h-4 w-4" />
          {configurar ? "Ocultar configuración" : "Elegir centros"}
        </Button>
      </div>
      {configurar && <ConfigCentros centros={todos} />}
      <MatrizPartes centros={centros} partes={partes} sel={centroSel?.id ?? null} onSel={setSel} />
      {centroSel && <DetalleCentro key={centroSel.id} centro={centroSel} partes={partes.filter((p) => p.centro_id === centroSel.id)} />}
    </div>
  );
}

function ConfigCentros({ centros }: { centros: Centro[] }) {
  const qc = useQueryClient();

  async function toggle(c: Centro) {
    const { error } = await supabase.from("centros").update({ supervisa_partes: !c.supervisa_partes }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["centros"] });
  }

  return (
    <section className="panel mb-4 p-4">
      <h2 className="mb-1 font-semibold">Centros con control de partes</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Desmarca los centros cuyos partes de ausencias no supervisas (escuelas infantiles, concertados…). No aparecerán en la matriz ni en el recuento de pendientes.
      </p>
      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {centros.map((c) => (
          <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm hover:bg-muted">
            <input
              type="checkbox"
              checked={c.supervisa_partes}
              onChange={() => toggle(c)}
              className="h-4 w-4 accent-primary"
            />
            <span className={cn(!c.supervisa_partes && "text-muted-foreground line-through")}>{c.nombre}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

function MatrizPartes({ centros, partes, sel, onSel }: { centros: Centro[]; partes: ParteAusencias[]; sel: string | null; onSel: (id: string) => void }) {
  const qc = useQueryClient();
  const mapa = new Map(partes.map((p) => [`${p.centro_id}|${p.mes}`, p]));

  async function toggle(centroId: string, mes: string) {
    const p = mapa.get(`${centroId}|${mes}`);
    const { error } = await supabase.from("partes_ausencias").upsert(
      {
        ...(p ? { id: p.id } : {}),
        centro_id: centroId,
        curso_escolar: CURSO,
        mes,
        presentado: !p?.presentado,
        fecha_presentacion: !p?.presentado ? (p?.fecha_presentacion ?? new Date().toISOString().slice(0, 10)) : p?.fecha_presentacion ?? null,
        observaciones: p?.observaciones ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "centro_id,curso_escolar,mes" },
    );
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["partes"] });
  }

  const pendientesMesActual = (() => {
    const idx = new Date().getMonth(); // 0=ene … 8=sep
    const mes = idx >= 8 ? MESES[idx - 8] : idx <= 5 ? MESES[idx + 4] : null;
    if (!mes) return 0;
    return centros.filter((c) => !mapa.get(`${c.id}|${mes}`)?.presentado).length;
  })();

  return (
    <section className="panel overflow-x-auto">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="font-semibold">Control mensual por centro</h2>
        <p className="text-sm text-muted-foreground">{pendientesMesActual} centros sin presentar el parte del mes en curso</p>
      </div>
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="px-4 py-2 font-medium">Centro</th>
            {MESES.map((m) => <th key={m} className="px-1 py-2 text-center font-mono text-[10px] uppercase text-muted-foreground">{m.slice(0, 3)}</th>)}
            <th className="px-3 py-2 text-center font-mono text-[10px] uppercase text-muted-foreground">Total</th>
          </tr>
        </thead>
        <tbody>
          {centros.map((c) => {
            const presentados = MESES.filter((m) => mapa.get(`${c.id}|${m}`)?.presentado).length;
            return (
              <tr key={c.id} className={cn("border-b last:border-0", sel === c.id && "bg-muted/50")}>
                <td className="px-4 py-1.5">
                  <button type="button" className="text-left font-medium hover:underline" onClick={() => onSel(c.id)}>{c.nombre}</button>
                </td>
                {MESES.map((m) => {
                  const p = mapa.get(`${c.id}|${m}`);
                  const okMes = !!p?.presentado;
                  return (
                    <td key={m} className="px-1 py-1.5 text-center">
                      <button
                        type="button"
                        aria-label={`${c.nombre} · ${m}: ${okMes ? "presentado" : "no presentado"}`}
                        title={p?.fecha_presentacion ? `Presentado el ${format(new Date(p.fecha_presentacion), "dd/MM/yyyy", { locale: es })}` : undefined}
                        onClick={() => toggle(c.id, m)}
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded border",
                          okMes ? "border-ok bg-ok text-primary-foreground" : "border-border bg-card text-muted-foreground/40 hover:bg-muted",
                          p?.observaciones && !okMes && "border-warn",
                        )}
                      >
                        {okMes ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  );
                })}
                <td className="px-3 py-1.5 text-center font-mono text-xs">{presentados}/10</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function DetalleCentro({ centro, partes }: { centro: Centro; partes: ParteAusencias[] }) {
  const qc = useQueryClient();
  const mapa = new Map(partes.map((p) => [p.mes, p]));
  const [mes, setMes] = useState<string>(MESES[0]);
  const p = mapa.get(mes);
  const [fecha, setFecha] = useState(p?.fecha_presentacion ?? "");
  const [obs, setObs] = useState(p?.observaciones ?? "");

  function cargar(m: string) {
    setMes(m);
    const r = mapa.get(m);
    setFecha(r?.fecha_presentacion ?? "");
    setObs(r?.observaciones ?? "");
  }

  async function guardar() {
    const { error } = await supabase.from("partes_ausencias").upsert(
      {
        ...(p ? { id: p.id } : {}),
        centro_id: centro.id,
        curso_escolar: CURSO,
        mes,
        presentado: p?.presentado ?? !!fecha,
        fecha_presentacion: fecha || null,
        observaciones: obs || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "centro_id,curso_escolar,mes" },
    );
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["partes"] });
    toast.success("Parte actualizado");
  }

  return (
    <section className="panel mt-6 p-4">
      <h2 className="mb-3 font-serif text-xl font-semibold text-primary">Detalle · {centro.nombre}</h2>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {MESES.map((m) => {
          const r = mapa.get(m);
          return (
            <button
              key={m}
              type="button"
              onClick={() => cargar(m)}
              className={cn(
                "rounded border px-2.5 py-1 text-xs font-medium",
                mes === m ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
                r?.presentado && mes !== m && "border-ok/50 text-ok",
              )}
            >
              {m}
            </button>
          );
        })}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Fecha de presentación</Label>
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <p className="text-xs text-muted-foreground">Estado: {p?.presentado ? "Presentado" : "No presentado"}</p>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs">Observaciones</Label>
          <Textarea rows={3} placeholder="Incidencias, requerimientos al centro, número de ausencias…" value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
      </div>
      <Button className="mt-3" onClick={guardar}>Guardar {mes}</Button>
    </section>
  );
}
