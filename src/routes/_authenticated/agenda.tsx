import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { puedeUsarOutlookCompartido } from "@/lib/outlook-acceso";
import { toast } from "sonner";
import {
  addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Check, Printer, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { centrosQuery, eventosQuery, guardiasQuery, type Evento } from "@/lib/queries";
import { TIPOS_EVENTO, TIPO_OUTLOOK } from "@/lib/constants";
import { OTRO_CENTRO, SIN_CENTRO, centroTextoGuardado } from "@/lib/centro-evento";
import { FESTIVOS, toISODate } from "@/lib/plazos";
import { cn } from "@/lib/utils";
import { esDiaGuardia, esTrabajoDistancia } from "@/lib/trabajo-distancia";
import { useConfiguracion, nombreInspector } from "@/lib/configuracion";
import { useServerFn } from "@tanstack/react-start";
import { entradasAgenda, periodoAgenda, type VistaAgenda } from "@/lib/agenda-export";
import { sincronizarOutlook } from "@/lib/outlook.functions";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({ meta: [{ title: "Agenda y Plazos · SIE-CLM" }, { name: "description", content: "Visitas, tareas y vencimientos de trámites." }, { property: "og:title", content: "Agenda y Plazos · SIE-CLM" }, { property: "og:description", content: "Visitas, tareas y vencimientos de trámites." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AgendaPage,
});

const color: Record<string, string> = {
  "Visita a Centro": "bg-primary text-primary-foreground",
  "Vencimiento Trámite": "bg-crimson text-crimson-foreground",
  "Reunión Inspección": "bg-secondary text-secondary-foreground",
  "Tarea Despacho": "bg-warn-soft text-warn",
  "Actividades de Formación": "bg-ok-soft text-ok",
  "Tareas de Coordinación": "bg-accent text-accent-foreground ring-1 ring-border",
  [TIPO_OUTLOOK]: "bg-muted text-muted-foreground ring-1 ring-border",
};
const SIN = SIN_CENTRO;

function AgendaPage() {
  const eventosEstado = useQuery(eventosQuery);
  const centrosEstado = useQuery(centrosQuery);
  const guardiasEstado = useQuery(guardiasQuery);
  const eventos = eventosEstado.data ?? [];
  const centros = centrosEstado.data ?? [];
  const guardias = guardiasEstado.data ?? [];
  const config = useConfiguracion();
  const [imprimiendo, setImprimiendo] = useState(false);
  const [vista, setVista] = useState<VistaAgenda>("mes");
  const [ref, setRef] = useState(new Date());
  const [edit, setEdit] = useState<Partial<Evento> | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const qc = useQueryClient();
  const sincronizar = useServerFn(sincronizarOutlook);
  const [correoUsuario, setCorreoUsuario] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setCorreoUsuario(data.user?.email ?? null)); }, []);
  const outlookDisponible = puedeUsarOutlookCompartido(correoUsuario);
  const { data: semanal } = useQuery({ queryKey: ["trabajo_distancia"], staleTime: 30 * 60_000, queryFn: async () => {
    const { data, error } = await supabase.from("trabajo_distancia").select("dia_semana,dia_guardia").maybeSingle();
    if (error) throw error;
    const { data: cs, error: e2 } = await supabase.from("guardia_semanas").select("semana,fecha");
    if (e2) throw e2;
    return { distancia: data?.dia_semana ?? null, guardia: data?.dia_guardia ?? null, cambios: Object.fromEntries((cs ?? []).map((c) => [c.semana, c.fecha])) as Record<string, string | null> };
  } });
  const diaDistancia = semanal?.distancia ?? null;
  const diaGuardia = semanal?.guardia ?? null;
  const cambiosGuardia = semanal?.cambios ?? {};
  const [semanaGuardia, setSemanaGuardia] = useState<Date | null>(null);
  async function cambiarDiaSemanal(campo: "dia_semana" | "dia_guardia", v: string) {
    const dia = v === "ninguno" ? null : Number(v);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("trabajo_distancia").upsert({ user_id: u.user.id, [campo]: dia, updated_at: new Date().toISOString() });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["trabajo_distancia"] });
    toast.success(campo === "dia_guardia" ? (dia ? "Día de guardia guardado" : "Guardia semanal desactivada") : (dia ? "Día de Trabajo a Distancia guardado" : "Trabajo a Distancia desactivado"));
  }
  async function cambiarGuardiaSemana(lunes: Date, valor: string | null | "habitual") {
    const semana = toISODate(lunes);
    const { error } = valor === "habitual"
      ? await supabase.from("guardia_semanas").delete().eq("semana", semana)
      : await supabase.from("guardia_semanas").upsert({ semana, fecha: valor });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["trabajo_distancia"] });
    setSemanaGuardia(null);
  }

  const ini = vista === "mes" ? startOfWeek(startOfMonth(ref), { weekStartsOn: 1 }) : startOfWeek(ref, { weekStartsOn: 1 });
  const fin = vista === "mes" ? endOfWeek(endOfMonth(ref), { weekStartsOn: 1 }) : endOfWeek(ref, { weekStartsOn: 1 });
  const dias: Date[] = [];
  for (let d = ini; d <= fin; d = addDays(d, 1)) dias.push(d);
  const delDia = (d: Date) => eventos.filter((e) => isSameDay(new Date(e.fecha_inicio), d));
  const mover = (n: number) => setRef(vista === "semana" ? addWeeks(ref, n) : addMonths(ref, n));
  const pendientes = entradasAgenda(eventos, [], centros, "agenda", ref);
  const datosListos = [eventosEstado, centrosEstado, guardiasEstado].every((q) => q.isSuccess && !q.isFetching);
  async function sincronizarConOutlook() {
    setSincronizando(true);
    try {
      const { inicio, fin } = periodoAgenda(vista, ref, new Date());
      const hasta = fin ?? addDays(inicio, 90);
      const r = await sincronizar({ data: { desde: inicio.toISOString(), hasta: hasta.toISOString() } });
      qc.invalidateQueries({ queryKey: ["eventos"] });
      toast.success(
        r.traidos || r.enviados
          ? `${r.traidos} ${r.traidos === 1 ? "cita traída" : "citas traídas"} de Outlook · ${r.enviados} ${r.enviados === 1 ? "enviada" : "enviadas"} a Outlook`
          : `No hay nada nuevo que sincronizar (${r.vistos} compromisos revisados)`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se ha podido sincronizar con Outlook");
    } finally {
      setSincronizando(false);
    }
  }
  async function imprimir() {
    setImprimiendo(true);
    try {
      const hoy = new Date();
      const { descargarAgendaPDF } = await import("@/lib/agenda-pdf");
      await descargarAgendaPDF({ vista, referencia: ref, hoy, entradas: entradasAgenda(eventos, guardias, centros, vista, ref, hoy), inspector: nombreInspector(config), provincia: config.provincia });
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se ha podido generar el PDF"); }
    finally { setImprimiendo(false); }
  }

  return (
    <div>
      <PageHeader eyebrow="Módulo 4" title="Agenda y Control de Plazos">
        <Button variant="outline" onClick={imprimir} disabled={imprimiendo || !datosListos}>
          {imprimiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          {vista === "agenda" ? "PDF de pendientes" : vista === "semana" ? "PDF de la semana" : "PDF del mes"}
        </Button>
        {outlookDisponible && (
          <Button variant="outline" onClick={sincronizarConOutlook} disabled={sincronizando}>
            {sincronizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sincronizar con Outlook
          </Button>
        )}
        <Button onClick={() => setEdit({ tipo_evento: "Visita a Centro", fecha_inicio: format(new Date(), "yyyy-MM-dd'T'09:00"), titulo: "" })}><Plus className="h-4 w-4" /> Nuevo evento</Button>
      </PageHeader>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={vista} onValueChange={(v) => { if (v === "mes" || v === "semana" || v === "agenda") setVista(v); }}>
          <TabsList><TabsTrigger value="mes">Mes</TabsTrigger><TabsTrigger value="semana">Semana</TabsTrigger><TabsTrigger value="agenda">Agenda</TabsTrigger></TabsList>
        </Tabs>
        {vista !== "agenda" && (
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" onClick={() => mover(-1)} aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => setRef(new Date())}>Hoy</Button>
            <Button size="icon" variant="outline" onClick={() => mover(1)} aria-label="Siguiente"><ChevronRight className="h-4 w-4" /></Button>
            <span className="ml-2 font-serif text-lg font-semibold capitalize text-primary">
              {vista === "mes" ? format(ref, "MMMM yyyy", { locale: es }) : `${format(ini, "d MMM", { locale: es })} – ${format(fin, "d MMM yyyy", { locale: es })}`}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Trabajo a Distancia:</span>
          <Select value={diaDistancia ? String(diaDistancia) : "ninguno"} onValueChange={(v) => cambiarDiaSemanal("dia_semana", v)}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ninguno">Ninguno</SelectItem>
              {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].map((n, i) => <SelectItem key={n} value={String(i + 1)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="ml-2 text-muted-foreground">Guardia:</span>
          <Select value={diaGuardia ? String(diaGuardia) : "ninguno"} onValueChange={(v) => cambiarDiaSemanal("dia_guardia", v)}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ninguno">Ninguno</SelectItem>
              {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].map((n, i) => <SelectItem key={n} value={String(i + 1)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex flex-wrap gap-3 text-xs">
          {TIPOS_EVENTO.map((t) => <span key={t} className="flex items-center gap-1"><span className={cn("h-2.5 w-2.5 rounded-sm", color[t])} />{t}</span>)}
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-muted ring-1 ring-border" />Desde Outlook</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-ok-soft ring-1 ring-ok/40" />Trámite finalizado</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-crimson/15 ring-1 ring-crimson/30" />Guardia</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-crimson/20 ring-1 ring-crimson/40" />Festivo</span>
        </div>
      </div>

      {vista === "agenda" ? (
        <ul className="panel divide-y">
          {!pendientes.length && <li className="px-4 py-6 text-sm text-muted-foreground">No hay eventos pendientes desde hoy.</li>}
          {pendientes.map((e) => (
            <li key={e.id} className="flex cursor-pointer flex-wrap items-center gap-4 px-4 py-3 hover:bg-accent/50" onClick={() => { const original = eventos.find((ev) => ev.id === e.id); if (original) setEdit(original); }}>
              <span className="w-28 font-mono text-xs">{format(new Date(`${e.fecha}T${e.hora}`), "EEE dd/MM HH:mm", { locale: es })}</span>
              <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", color[e.tipo] ?? color["Tarea Despacho"])}>{e.tipo}</span>
              <span className="min-w-40 flex-1 text-sm">{e.titulo}</span>
              <span className="text-xs text-muted-foreground">{e.centro}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="panel overflow-hidden">
          <div className="grid grid-cols-7 border-b bg-muted/60">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => <div key={d} className="eyebrow px-2 py-1.5">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {dias.map((d) => {
              const festivo = FESTIVOS[toISODate(d)];
              const finde = d.getDay() === 0 || d.getDay() === 6;
              return (
              <div key={d.toISOString()} className={cn("border-b border-r p-1.5", vista === "mes" ? "min-h-28" : "min-h-80", !isSameMonth(d, ref) && vista === "mes" && "bg-muted/40", festivo && "bg-crimson/10", !festivo && finde && "bg-muted/30")}
                onDoubleClick={() => setEdit({ tipo_evento: "Visita a Centro", fecha_inicio: format(d, "yyyy-MM-dd'T'09:00"), titulo: "" })}>
                <p className={cn("mb-1 font-mono text-xs", festivo && "font-semibold text-crimson", isSameDay(d, new Date()) && "inline-block rounded bg-crimson px-1.5 text-crimson-foreground")}>{format(d, "d")}</p>
                {festivo && <p className="mb-1 truncate text-[10px] font-medium text-crimson" title={festivo}>{festivo}</p>}
                {esTrabajoDistancia(d, diaDistancia) && <p className="mb-1 truncate rounded bg-ok-soft px-1.5 py-0.5 text-[10px] font-semibold text-ok ring-1 ring-ok/40">Trabajo a Distancia</p>}
                {esDiaGuardia(d, diaGuardia, cambiosGuardia) && (
                  <button type="button" onClick={() => setSemanaGuardia(startOfWeek(d, { weekStartsOn: 1 }))} title="Cambiar o quitar la guardia de esta semana"
                    className="mb-1 block w-full truncate rounded bg-crimson px-1.5 py-0.5 text-left text-[10px] font-semibold text-crimson-foreground">Día de guardia</button>
                )}
                <div className="space-y-1">
                  {delDia(d).map((e) => (
                    <button key={e.id} type="button" onClick={() => setEdit(e)} className={cn("block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px]", e.realizada && e.tipo_evento === "Vencimiento Trámite" ? "bg-ok-soft text-ok ring-1 ring-ok/40" : (color[e.tipo_evento] ?? color["Tarea Despacho"]), e.realizada && "opacity-60 line-through")}>
                      {format(new Date(e.fecha_inicio), "HH:mm")} {e.titulo}
                    </button>
                  ))}
                  {guardias.filter((g) => g.fecha === toISODate(d)).map((g) => (
                    <Link key={g.id} to="/guardias" className="block w-full truncate rounded bg-crimson/15 px-1.5 py-0.5 text-left text-[11px] text-crimson ring-1 ring-crimson/30">
                      Guardia · {g.persona_nombre}
                    </Link>
                  ))}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}
      <Dialog open={!!semanaGuardia} onOpenChange={(v) => !v && setSemanaGuardia(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Guardia de la semana del {semanaGuardia ? format(semanaGuardia, "d 'de' MMMM", { locale: es }) : ""}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Solo cambia esta semana; las demás siguen con tu día habitual.</p>
          <div className="grid gap-2">
            {semanaGuardia && [0, 1, 2, 3, 4].map((i) => { const d = addDays(semanaGuardia, i); return (
              <div key={i} className="flex gap-2">
                <Button className="flex-1 justify-start capitalize" variant={esDiaGuardia(d, diaGuardia, cambiosGuardia) ? "default" : "outline"} onClick={() => cambiarGuardiaSemana(semanaGuardia, toISODate(d))}>
                  Guardia el {format(d, "EEEE d", { locale: es })}
                </Button>
                <Button variant="ghost" onClick={() => { setSemanaGuardia(null); setEdit({ tipo_evento: "Visita a Centro", fecha_inicio: format(d, "yyyy-MM-dd'T'09:00"), titulo: "" }); }}>Visita</Button>
              </div>
            ); })}
          </div>
          <DialogFooter className="gap-2">
            {semanaGuardia && <Button variant="ghost" onClick={() => cambiarGuardiaSemana(semanaGuardia, "habitual")}>Volver al día habitual</Button>}
            {semanaGuardia && <Button variant="outline" onClick={() => cambiarGuardiaSemana(semanaGuardia, null)}>Sin guardia esta semana</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <EditorEvento ev={edit} onClose={() => setEdit(null)} />
    </div>
  );
}

function EditorEvento({ ev, onClose }: { ev: Partial<Evento> | null; onClose: () => void }) {
  const qc = useQueryClient();
  const config = useConfiguracion();
  const { data: centros = [] } = useQuery(centrosQuery);
  const [f, setF] = useState<Partial<Evento>>({});
  const [lastEv, setLastEv] = useState<Partial<Evento> | null>(null);
  const [otro, setOtro] = useState(false);
  if (ev !== lastEv) {
    setLastEv(ev);
    setOtro(!!ev && !ev.centro_id && !!ev.centro_texto?.trim());
    if (ev) { const fi = ev.fecha_inicio ?? ""; setF({ ...ev, fecha_inicio: fi.includes("Z") || fi.includes("+") ? format(new Date(fi), "yyyy-MM-dd'T'HH:mm") : fi }); }
  }
  const esVencimiento = !!f.tramite_id;

  async function guardar() {
    if (!f.titulo?.trim() || !f.fecha_inicio) { toast.error("Título y fecha obligatorios"); return; }
    const centroEscrito = otro ? centroTextoGuardado(f) : "";
    if (f.tipo_evento === "Visita a Centro" && !f.centro_id && !centroEscrito) { toast.error("Indica el centro de la visita"); return; }
    const payload = {
      titulo: f.titulo, tipo_evento: f.tipo_evento ?? "Visita a Centro", centro_id: f.centro_id ?? null, centro_texto: centroEscrito,
      fecha_inicio: new Date(f.fecha_inicio).toISOString(), realizada: !!f.realizada, notas_visita: f.notas_visita ?? null,
      ...(!f.id ? { inspector_visita: nombreInspector(config), cargo_visita: config.cargo, provincia_visita: config.provincia } : {}),
    };
    const { error } = f.id ? await supabase.from("agenda_eventos").update(payload).eq("id", f.id) : await supabase.from("agenda_eventos").insert(payload);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["eventos"] });
    onClose();
  }
  async function borrar() {
    if (!f.id) return;
    const { error } = await supabase.from("agenda_eventos").delete().eq("id", f.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["eventos"] });
    onClose();
  }

  return (
    <Dialog open={!!ev} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{f.id ? "Editar evento" : "Nuevo evento"}</DialogTitle></DialogHeader>
        {esVencimiento && <p className="rounded bg-late-soft p-2 text-xs text-late">Vencimiento generado automáticamente desde un trámite. Cambia la fecha límite en el módulo de Trámites.</p>}
        {!!f.outlook_id && <p className="rounded bg-muted p-2 text-xs text-muted-foreground">Aparece también en tu calendario de Outlook.</p>}
        <div className="grid gap-3">
          <div className="space-y-1.5"><Label>Título</Label><Input value={f.titulo ?? ""} onChange={(e) => setF({ ...f, titulo: e.target.value })} disabled={esVencimiento} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Tipo</Label>
              <Select value={f.tipo_evento ?? "Visita a Centro"} onValueChange={(v) => setF({ ...f, tipo_evento: v })} disabled={esVencimiento}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[...TIPOS_EVENTO, ...(f.tipo_evento === TIPO_OUTLOOK ? [TIPO_OUTLOOK] : [])].filter((t) => esVencimiento || t !== "Vencimiento Trámite").map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Fecha y hora</Label><Input type="datetime-local" value={f.fecha_inicio ?? ""} onChange={(e) => setF({ ...f, fecha_inicio: e.target.value })} disabled={esVencimiento} /></div>
          </div>
          <div className="space-y-1.5"><Label>Centro</Label>
            <Select value={f.centro_id ?? (otro ? OTRO_CENTRO : SIN)} disabled={esVencimiento} onValueChange={(v) => {
              if (v === OTRO_CENTRO) { setOtro(true); setF({ ...f, centro_id: null, centro_texto: f.centro_texto ?? "" }); return; }
              setOtro(false);
              setF({ ...f, centro_id: v === SIN ? null : v, centro_texto: "" });
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={SIN}>Sin centro</SelectItem><SelectItem value={OTRO_CENTRO}>Otro centro (escribir)</SelectItem>{centros.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
            </Select>
            {otro && !f.centro_id && <Input placeholder="Nombre del centro" value={f.centro_texto ?? ""} onChange={(e) => setF({ ...f, centro_texto: e.target.value })} />}
          </div>
          {!esVencimiento && <div className="space-y-1.5"><Label>Notas de la visita / tarea</Label><Textarea rows={3} value={f.notas_visita ?? ""} onChange={(e) => setF({ ...f, notas_visita: e.target.value })} /></div>}
          {!esVencimiento && (
            <Button variant={f.realizada ? "default" : "outline"} onClick={() => setF({ ...f, realizada: !f.realizada })}>
              <Check className="h-4 w-4" /> {f.realizada ? "Realizada" : "Marcar como realizada"}
            </Button>
          )}
        </div>
        {!esVencimiento && (
          <DialogFooter className="gap-2">
            {f.id && f.tipo_evento === "Visita a Centro" && <Button asChild variant="outline"><Link to="/visitas">Registro de visitas</Link></Button>}
            {f.id && <Button variant="ghost" onClick={borrar}>Eliminar</Button>}
            <Button onClick={guardar}>Guardar</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
