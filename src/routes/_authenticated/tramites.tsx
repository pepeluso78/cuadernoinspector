import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Mail, Plus, Search, Trash2, BookOpen, Copy, Inbox, CheckCircle2, RotateCcw } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { importarCorreosFn } from "@/lib/correo.functions";
import { DocumentosTramite } from "@/components/documentos-tramite";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { CuentaAtras } from "@/components/semaforo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { centrosQuery, normativaQuery, tramitesQuery, type Tramite } from "@/lib/queries";
import { calcularFechaLimite, PLAZOS_POR_TIPO, toISODate, PLAZO_GENERAL } from "@/lib/plazos";
import { BUZON_URL, ESTADOS_TRAMITE, esTramiteCerrado, ORIGENES, TIPOS_ACTUACION } from "@/lib/constants";
import { useConfiguracion, nombreInspector } from "@/lib/configuracion";

export const Route = createFileRoute("/_authenticated/tramites")({
  validateSearch: (s: Record<string, unknown>): { nuevo?: boolean } => (s["nuevo"] === true || s["nuevo"] === "true" ? { nuevo: true } : {}),
  head: () => ({ meta: [{ title: "Trámites y Correo · SIE-CLM" }, { name: "description", content: "Entradas, notas interiores, documentos adjuntos y control de plazos." }, { property: "og:title", content: "Trámites y Correo · SIE-CLM" }, { property: "og:description", content: "Entradas, notas interiores, documentos adjuntos y control de plazos." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: TramitesPage,
});

const SIN_CENTRO = "__none";

function TramitesPage() {
  const config = useConfiguracion();
  const { nuevo } = Route.useSearch();
  const navigate = useNavigate();
  const { data: tramites = [] } = useQuery(tramitesQuery);
  const { data: centros = [] } = useQuery(centrosQuery);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<Tramite | null>(null);
  const qc = useQueryClient();
  const importarFn = useServerFn(importarCorreosFn);
  const [importando, setImportando] = useState(false);
  async function importar() {
    setImportando(true);
    try {
      const r = await importarFn();
      if ("error" in r && r.error) toast.error(r.error);
      else {
        toast.success(r.creados || r.adjuntos ? `${r.creados} trámite(s) y ${r.adjuntos} adjunto(s) importados` : "No hay correos ni adjuntos nuevos");
        for (const error of r.errores) toast.error(error);
      }
      qc.invalidateQueries({ queryKey: ["tramites"] });
      qc.invalidateQueries({ queryKey: ["eventos"] });
      qc.invalidateQueries({ queryKey: ["documentos-tramite"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo importar el correo"); }
    finally { setImportando(false); }
  }

  useEffect(() => {
    if (nuevo) {
      setOpen(true);
      navigate({ to: "/tramites", search: {}, replace: true });
    }
  }, [nuevo, navigate]);

  const coincide = (t: Tramite) => `${t.asunto} ${t.numero_registro} ${t.remitente}`.toLowerCase().includes(q.toLowerCase());
  const pendientes = useMemo(() => tramites.filter((t) => !esTramiteCerrado(t.estado) && coincide(t)), [tramites, q]);
  const realizados = useMemo(() => tramites.filter((t) => esTramiteCerrado(t.estado) && coincide(t)), [tramites, q]);
  const nombreCentro = (id: string | null) => centros.find((c) => c.id === id)?.nombre ?? "—";

  return (
    <div>
      <PageHeader eyebrow="Módulo 1 · Regla de 10 días lectivos" title="Trámites y Correo">
        <Button variant="outline" asChild>
          <a href={BUZON_URL} target="_blank" rel="noreferrer"><Mail className="h-4 w-4" /> Buzón {config.correo_referencia}</a>
        </Button>
        <Button variant="outline" disabled={importando} onClick={importar}><Inbox className="h-4 w-4" /> {importando ? "Leyendo correo…" : "Importar del correo"}</Button>
        <Button variant="crimson" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nueva Entrada / Nota Interior</Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por asunto, registro o remitente" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <h2 className="eyebrow mb-2">Trámites pendientes ({pendientes.length})</h2>
      <TablaTramites lista={pendientes} nombreCentro={nombreCentro} onSelect={setSel} vacio="No hay trámites pendientes." />

      <h2 className="eyebrow mb-2 mt-8">Trámites realizados ({realizados.length})</h2>
      <TablaTramites lista={realizados} nombreCentro={nombreCentro} onSelect={setSel} vacio="Todavía no hay trámites realizados." realizados />

      <NuevoTramite open={open} onOpenChange={setOpen} />
      <DetalleTramite tramite={sel} onClose={() => setSel(null)} />
    </div>
  );
}

function TablaTramites({ lista, nombreCentro, onSelect, vacio, realizados }: { lista: Tramite[]; nombreCentro: (id: string | null) => string; onSelect: (t: Tramite) => void; vacio: string; realizados?: boolean }) {
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/60 text-left">
          <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:eyebrow">
            <th>Registro</th><th>Asunto</th><th>Origen</th><th>Centro</th><th>Entrada</th><th>Límite</th><th>Plazo</th><th>Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {lista.map((t) => (
            <tr key={t.id} className={`cursor-pointer hover:bg-accent/50 [&>td]:px-3 [&>td]:py-2.5 ${realizados ? "bg-ok-soft/40" : ""}`} onClick={() => onSelect(t)}>
              <td className="font-mono text-xs">{t.numero_registro || "—"}</td>
              <td className="font-medium">{t.asunto}</td>
              <td className="text-muted-foreground">{t.origen}</td>
              <td className="text-muted-foreground">{nombreCentro(t.centro_id)}</td>
              <td className="font-mono text-xs">{t.fecha_entrada}</td>
              <td className="font-mono text-xs">{t.fecha_limite}</td>
              <td>{t.fecha_limite && <CuentaAtras fechaLimite={t.fecha_limite} cerrado={esTramiteCerrado(t.estado)} />}</td>
              <td className="text-xs">{t.estado === "Finalizado" ? <span className="inline-flex items-center gap-1 rounded border border-ok/30 bg-ok-soft px-2 py-0.5 font-semibold text-ok"><CheckCircle2 className="h-3 w-3" /> Finalizado</span> : t.estado}</td>
            </tr>
          ))}
          {!lista.length && <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">{vacio}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function NuevoTramite({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const { data: centros = [] } = useQuery(centrosQuery);
  const hoy = toISODate(new Date());
  const vacio = {
    numero_registro: "", origen: "Nota Interior", remitente: "", centro_id: SIN_CENTRO, asunto: "", descripcion_entrada: "",
    tipo_actuacion: "Informe Nota Interior", plazo_dias: PLAZO_GENERAL, fecha_entrada: hoy, prioridad: "Media",
  };
  const [f, setF] = useState(vacio);
  const [limiteManual, setLimiteManual] = useState<string | null>(null);
  const limite = limiteManual ?? calcularFechaLimite(f.fecha_entrada, f.plazo_dias);
  const set = (k: keyof typeof f, v: string | number) => setF((p) => ({ ...p, [k]: v }));

  async function guardar() {
    if (!f.asunto.trim()) { toast.error("El asunto es obligatorio"); return; }
    const { error } = await supabase.from("tramites").insert({
      ...f, centro_id: f.centro_id === SIN_CENTRO ? null : f.centro_id, fecha_limite: limite, estado: "Pendiente",
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Trámite registrado. Vence el ${limite} y se ha añadido a la agenda.`);
    qc.invalidateQueries({ queryKey: ["tramites"] });
    qc.invalidateQueries({ queryKey: ["eventos"] });
    setF(vacio); setLimiteManual(null); onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Nueva Entrada / Nota Interior</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Origen">
            <Select value={f.origen} onValueChange={(v) => { set("origen", v); if (v === "Reclamación") { set("plazo_dias", 2); setLimiteManual(null); } }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ORIGENES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </Campo>
          <Campo label="Nº de registro"><Input value={f.numero_registro} onChange={(e) => set("numero_registro", e.target.value)} placeholder="NI-2026/0001" /></Campo>
          <Campo label="Asunto" full><Input value={f.asunto} onChange={(e) => set("asunto", e.target.value)} /></Campo>
          <Campo label="Remitente"><Input value={f.remitente} onChange={(e) => set("remitente", e.target.value)} /></Campo>
          <Campo label="Centro">
            <Select value={f.centro_id} onValueChange={(v) => set("centro_id", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_CENTRO}>Sin centro</SelectItem>
                {centros.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </Campo>
          <Campo label="Tipo de actuación">
            <Select value={f.tipo_actuacion} onValueChange={(v) => set("tipo_actuacion", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS_ACTUACION.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </Campo>
          <Campo label="Prioridad">
            <Select value={f.prioridad} onValueChange={(v) => set("prioridad", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Baja", "Media", "Alta"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </Campo>
          <Campo label="Fecha de entrada"><Input type="date" value={f.fecha_entrada} onChange={(e) => { set("fecha_entrada", e.target.value); setLimiteManual(null); }} /></Campo>
          <Campo label="Plazo">
            <Select value={String(f.plazo_dias)} onValueChange={(v) => { set("plazo_dias", Number(v)); setLimiteManual(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLAZOS_POR_TIPO.map((p) => <SelectItem key={p.dias} value={String(p.dias)}>{p.label}</SelectItem>)}
                {!PLAZOS_POR_TIPO.some((p) => p.dias === f.plazo_dias) && <SelectItem value={String(f.plazo_dias)}>{f.plazo_dias} días</SelectItem>}
              </SelectContent>
            </Select>
          </Campo>
          <Campo label="Plazo manual (días)"><Input type="number" min={1} value={f.plazo_dias} onChange={(e) => { set("plazo_dias", Math.max(1, Number(e.target.value) || 1)); setLimiteManual(null); }} /></Campo>
          <Campo label="Fecha límite (calculada)"><Input type="date" value={limite} onChange={(e) => setLimiteManual(e.target.value)} className="font-semibold" /></Campo>
          <Campo label="Descripción / texto de entrada" full><Textarea rows={4} value={f.descripcion_entrada} onChange={(e) => set("descripcion_entrada", e.target.value)} /></Campo>
        </div>
        <DialogFooter><Button onClick={guardar}>Registrar trámite</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Campo({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}><Label>{label}</Label>{children}</div>;
}

function DetalleTramite({ tramite, onClose }: { tramite: Tramite | null; onClose: () => void }) {
  const config = useConfiguracion();
  const qc = useQueryClient();
  const { data: normas = [] } = useQuery(normativaQuery);
  const [d, setD] = useState<Tramite | null>(tramite);
  const [qn, setQn] = useState("");
  useEffect(() => setD(tramite), [tramite]);
  if (!d) return <Sheet open={false} />;
  const upd = (k: keyof Tramite, v: string | number) => setD({ ...d, [k]: v } as Tramite);

  function plantilla() {
    if (!d) return;
    upd("borrador_informe",
      `INFORME DE LA INSPECCIÓN DE EDUCACIÓN\n\nASUNTO: ${d.asunto}\nREF.: ${d.numero_registro ?? ""}\n\nANTECEDENTES DE HECHO\nPrimero.- Con fecha ${d.fecha_entrada} se recibe ${d.origen.toLowerCase()} remitida por ${d.remitente || "—"}.\n\nFUNDAMENTOS DE DERECHO\n\n\nCONCLUSIONES / PROPUESTA\n\n\n${config.provincia}, ${new Date().toLocaleDateString("es-ES")}\n${config.cargo}\nFdo.: ${nombreInspector(config)}`);
  }
  function insertarCita(cita: string) {
    if (!d) return;
    const actual = d.borrador_informe ?? "";
    const marca = "FUNDAMENTOS DE DERECHO\n";
    const nuevo = actual.includes(marca) ? actual.replace(marca, `${marca}- ${cita}\n`) : `${actual}\n- ${cita}`;
    upd("borrador_informe", nuevo);
    toast.success("Cita insertada en Fundamentos de Derecho");
  }
  async function guardar() {
    if (!d) return;
    const { id, created_at, ...rest } = d;
    void created_at;
    const { error } = await supabase.from("tramites").update(rest).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Trámite guardado");
    qc.invalidateQueries({ queryKey: ["tramites"] });
    qc.invalidateQueries({ queryKey: ["eventos"] });
  }
  async function borrar() {
    if (!d) return;
    if (!confirm("¿Eliminar este trámite?")) return;
    const { data: docs, error: docError } = await supabase.from("documentos_tramite").select("ruta").eq("tramite_id", d.id);
    if (docError) { toast.error(docError.message); return; }
    if (docs?.length) {
      const { error } = await supabase.storage.from("tramites-documentos").remove(docs.map((doc) => doc.ruta));
      if (error) { toast.error(error.message); return; }
    }
    const { error } = await supabase.from("tramites").delete().eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["tramites"] });
    qc.invalidateQueries({ queryKey: ["eventos"] });
    onClose();
  }
  async function finalizar() {
    if (!d) return;
    const { error } = await supabase.from("tramites").update({ estado: "Finalizado" }).eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Trámite finalizado");
    setD({ ...d, estado: "Finalizado" });
    qc.invalidateQueries({ queryKey: ["tramites"] });
    qc.invalidateQueries({ queryKey: ["eventos"] });
  }
  async function reabrir() {
    if (!d) return;
    const { error } = await supabase.from("tramites").update({ estado: "Pendiente" }).eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Trámite reabierto");
    setD({ ...d, estado: "Pendiente" });
    qc.invalidateQueries({ queryKey: ["tramites"] });
    qc.invalidateQueries({ queryKey: ["eventos"] });
  }
  const normasF = normas.filter((n) => n.titulo_norma.toLowerCase().includes(qn.toLowerCase())).slice(0, 6);

  return (
    <Sheet open={!!tramite} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <p className="eyebrow">{d.origen} · {d.numero_registro}</p>
          <SheetTitle className="font-serif text-2xl text-primary">{d.asunto}</SheetTitle>
          {d.fecha_limite && <div><CuentaAtras fechaLimite={d.fecha_limite} cerrado={esTramiteCerrado(d.estado)} /></div>}
        </SheetHeader>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Campo label="Estado">
            <Select value={d.estado ?? "Pendiente"} onValueChange={(v) => upd("estado", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ESTADOS_TRAMITE.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </Campo>
          <Campo label="Plazo (días)">
            <Input type="number" min={1} value={d.plazo_dias ?? 10} onChange={(e) => {
              const n = Math.max(1, Number(e.target.value) || 1);
              setD({ ...d, plazo_dias: n, fecha_limite: calcularFechaLimite(d.fecha_entrada ?? toISODate(new Date()), n) });
            }} />
          </Campo>
          <Campo label="Fecha límite"><Input type="date" value={d.fecha_limite ?? ""} onChange={(e) => upd("fecha_limite", e.target.value)} /></Campo>
        </div>
        <div className="mt-4 space-y-1.5">
          <Label>Texto del correo / escrito recibido</Label>
          <Textarea rows={6} placeholder={`Pega aquí el correo recibido en ${config.correo_referencia}`} value={d.descripcion_entrada ?? ""} onChange={(e) => upd("descripcion_entrada", e.target.value)} />
        </div>
        <DocumentosTramite key={d.id} tramiteId={d.id} />
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="space-y-1.5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <Label>Borrador de informe / respuesta</Label>
              <Button size="sm" variant="ghost" onClick={plantilla}>Usar plantilla</Button>
            </div>
            <Textarea rows={16} className="font-mono text-xs" value={d.borrador_informe ?? ""} onChange={(e) => upd("borrador_informe", e.target.value)} />
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(d.borrador_informe ?? ""); toast.success("Copiado"); }}><Copy className="h-3.5 w-3.5" /> Copiar borrador</Button>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> Vincular normativa</Label>
            <Input placeholder="Buscar norma" value={qn} onChange={(e) => setQn(e.target.value)} />
            <ul className="space-y-1.5">
              {normasF.map((n) => (
                <li key={n.id}>
                  <Button variant="outline" onClick={() => insertarCita(n.cita_informes ?? n.titulo_norma)} className="h-auto w-full justify-start whitespace-normal p-2 text-left text-xs">
                    <span className="font-semibold text-primary">{n.rango_normativo}</span> · {n.titulo_norma.slice(0, 90)}…
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-between gap-2">
          <Button variant="ghost" onClick={borrar}><Trash2 className="h-4 w-4" /> Eliminar</Button>
          <div className="flex flex-wrap gap-2">
            {d.estado === "Finalizado"
              ? <Button variant="outline" onClick={reabrir}><RotateCcw className="h-4 w-4" /> Reabrir trámite</Button>
              : <Button variant="crimson" onClick={finalizar}><CheckCircle2 className="h-4 w-4" /> Finalizar trámite</Button>}
            <Button onClick={guardar}>Guardar cambios</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
