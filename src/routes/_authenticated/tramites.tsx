import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Mail, Plus, Search, Trash2, BookOpen, Copy } from "lucide-react";
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
import { BUZON_URL, ESTADOS_TRAMITE, INSPECTOR, ORIGENES, TIPOS_ACTUACION } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/tramites")({
  validateSearch: (s: Record<string, unknown>): { nuevo?: boolean } => (s["nuevo"] === true || s["nuevo"] === "true" ? { nuevo: true } : {}),
  head: () => ({ meta: [{ title: "Trámites y Correo · SIE-CLM" }, { name: "description", content: "Entradas, notas interiores y control de plazos." }] }),
  component: TramitesPage,
});

const SIN_CENTRO = "__none";

function TramitesPage() {
  const { nuevo } = Route.useSearch();
  const navigate = useNavigate();
  const { data: tramites = [] } = useQuery(tramitesQuery);
  const { data: centros = [] } = useQuery(centrosQuery);
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("abiertos");
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<Tramite | null>(null);

  useEffect(() => {
    if (nuevo) {
      setOpen(true);
      navigate({ to: "/tramites", search: {}, replace: true });
    }
  }, [nuevo, navigate]);

  const lista = useMemo(
    () =>
      tramites
        .filter((t) => (filtro === "abiertos" ? t.estado !== "Respondido / Elevado" : filtro === "cerrados" ? t.estado === "Respondido / Elevado" : true))
        .filter((t) => `${t.asunto} ${t.numero_registro} ${t.remitente}`.toLowerCase().includes(q.toLowerCase())),
    [tramites, q, filtro],
  );
  const nombreCentro = (id: string | null) => centros.find((c) => c.id === id)?.nombre ?? "—";

  return (
    <div>
      <PageHeader eyebrow="Módulo 1 · Regla de 10 días" title="Trámites y Correo">
        <Button variant="outline" asChild>
          <a href={BUZON_URL} target="_blank" rel="noreferrer"><Mail className="h-4 w-4" /> Buzón {INSPECTOR.email}</a>
        </Button>
        <Button variant="crimson" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nueva Entrada / Nota Interior</Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por asunto, registro o remitente" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="abiertos">Abiertos</SelectItem>
            <SelectItem value="cerrados">Respondidos</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/60 text-left">
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:eyebrow">
              <th>Registro</th><th>Asunto</th><th>Origen</th><th>Centro</th><th>Entrada</th><th>Límite</th><th>Plazo</th><th>Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {lista.map((t) => (
              <tr key={t.id} className="cursor-pointer hover:bg-accent/50 [&>td]:px-3 [&>td]:py-2.5" onClick={() => setSel(t)}>
                <td className="font-mono text-xs">{t.numero_registro || "—"}</td>
                <td className="font-medium">{t.asunto}</td>
                <td className="text-muted-foreground">{t.origen}</td>
                <td className="text-muted-foreground">{nombreCentro(t.centro_id)}</td>
                <td className="font-mono text-xs">{t.fecha_entrada}</td>
                <td className="font-mono text-xs">{t.fecha_limite}</td>
                <td>{t.fecha_limite && <CuentaAtras fechaLimite={t.fecha_limite} cerrado={t.estado === "Respondido / Elevado"} />}</td>
                <td className="text-xs">{t.estado}</td>
              </tr>
            ))}
            {!lista.length && <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">No hay trámites.</td></tr>}
          </tbody>
        </table>
      </div>

      <NuevoTramite open={open} onOpenChange={setOpen} />
      <DetalleTramite tramite={sel} onClose={() => setSel(null)} />
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
  const qc = useQueryClient();
  const { data: normas = [] } = useQuery(normativaQuery);
  const [d, setD] = useState<Tramite | null>(tramite);
  const [qn, setQn] = useState("");
  useEffect(() => setD(tramite), [tramite]);
  if (!d) return <Sheet open={false} />;
  const upd = (k: keyof Tramite, v: string | number) => setD({ ...d, [k]: v } as Tramite);

  function plantilla() {
    upd("borrador_informe",
      `INFORME DE LA INSPECCIÓN DE EDUCACIÓN\n\nASUNTO: ${d!.asunto}\nREF.: ${d!.numero_registro ?? ""}\n\nANTECEDENTES DE HECHO\nPrimero.- Con fecha ${d!.fecha_entrada} se recibe ${d!.origen.toLowerCase()} remitida por ${d!.remitente || "—"}.\n\nFUNDAMENTOS DE DERECHO\n\n\nCONCLUSIONES / PROPUESTA\n\n\nAlbacete, ${new Date().toLocaleDateString("es-ES")}\nEl Inspector de Educación\nFdo.: ${INSPECTOR.nombre}`);
  }
  function insertarCita(cita: string) {
    const actual = d!.borrador_informe ?? "";
    const marca = "FUNDAMENTOS DE DERECHO\n";
    const nuevo = actual.includes(marca) ? actual.replace(marca, `${marca}- ${cita}\n`) : `${actual}\n- ${cita}`;
    upd("borrador_informe", nuevo);
    toast.success("Cita insertada en Fundamentos de Derecho");
  }
  async function guardar() {
    const { id, created_at, ...rest } = d!;
    void created_at;
    const { error } = await supabase.from("tramites").update(rest).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Trámite guardado");
    qc.invalidateQueries({ queryKey: ["tramites"] });
    qc.invalidateQueries({ queryKey: ["eventos"] });
  }
  async function borrar() {
    if (!confirm("¿Eliminar este trámite?")) return;
    await supabase.from("tramites").delete().eq("id", d!.id);
    qc.invalidateQueries({ queryKey: ["tramites"] });
    qc.invalidateQueries({ queryKey: ["eventos"] });
    onClose();
  }
  const normasF = normas.filter((n) => n.titulo_norma.toLowerCase().includes(qn.toLowerCase())).slice(0, 6);

  return (
    <Sheet open={!!tramite} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <p className="eyebrow">{d.origen} · {d.numero_registro}</p>
          <SheetTitle className="font-serif text-2xl text-primary">{d.asunto}</SheetTitle>
          {d.fecha_limite && <div><CuentaAtras fechaLimite={d.fecha_limite} cerrado={d.estado === "Respondido / Elevado"} /></div>}
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
          <Textarea rows={6} placeholder={`Pega aquí el correo recibido en ${INSPECTOR.email}`} value={d.descripcion_entrada ?? ""} onChange={(e) => upd("descripcion_entrada", e.target.value)} />
        </div>
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
                  <button type="button" onClick={() => insertarCita(n.cita_informes ?? n.titulo_norma)} className="w-full rounded border p-2 text-left text-xs hover:bg-accent">
                    <span className="font-semibold text-primary">{n.rango_normativo}</span> · {n.titulo_norma.slice(0, 90)}…
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-6 flex justify-between">
          <Button variant="ghost" onClick={borrar}><Trash2 className="h-4 w-4" /> Eliminar</Button>
          <Button onClick={guardar}>Guardar cambios</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
