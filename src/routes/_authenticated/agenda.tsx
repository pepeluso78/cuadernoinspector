import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { centrosQuery, eventosQuery, type Evento } from "@/lib/queries";
import { TIPOS_EVENTO } from "@/lib/constants";
import { FESTIVOS, toISODate } from "@/lib/plazos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({ meta: [{ title: "Agenda y Plazos · SIE-CLM" }, { name: "description", content: "Visitas, tareas y vencimientos de trámites." }, { property: "og:title", content: "Agenda y Plazos · SIE-CLM" }, { property: "og:description", content: "Visitas, tareas y vencimientos de trámites." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AgendaPage,
});

const color: Record<string, string> = {
  "Visita a Centro": "bg-primary text-primary-foreground",
  "Vencimiento Trámite": "bg-crimson text-crimson-foreground",
  "Reunión Inspección": "bg-secondary text-secondary-foreground",
  "Tarea Despacho": "bg-warn-soft text-warn",
};
const SIN = "__none";

function AgendaPage() {
  const { data: eventos = [] } = useQuery(eventosQuery);
  const { data: centros = [] } = useQuery(centrosQuery);
  const [vista, setVista] = useState("mes");
  const [ref, setRef] = useState(new Date());
  const [edit, setEdit] = useState<Partial<Evento> | null>(null);

  const ini = vista === "mes" ? startOfWeek(startOfMonth(ref), { weekStartsOn: 1 }) : startOfWeek(ref, { weekStartsOn: 1 });
  const fin = vista === "mes" ? endOfWeek(endOfMonth(ref), { weekStartsOn: 1 }) : endOfWeek(ref, { weekStartsOn: 1 });
  const dias: Date[] = [];
  for (let d = ini; d <= fin; d = addDays(d, 1)) dias.push(d);
  const delDia = (d: Date) => eventos.filter((e) => isSameDay(new Date(e.fecha_inicio), d));
  const mover = (n: number) => setRef(vista === "semana" ? addWeeks(ref, n) : addMonths(ref, n));
  const nombreCentro = (id: string | null) => centros.find((c) => c.id === id)?.nombre;

  return (
    <div>
      <PageHeader eyebrow="Módulo 4" title="Agenda y Control de Plazos">
        <Button onClick={() => setEdit({ tipo_evento: "Visita a Centro", fecha_inicio: format(new Date(), "yyyy-MM-dd'T'09:00"), titulo: "" })}><Plus className="h-4 w-4" /> Nuevo evento</Button>
      </PageHeader>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={vista} onValueChange={setVista}>
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
        <div className="ml-auto flex flex-wrap gap-3 text-xs">
          {TIPOS_EVENTO.map((t) => <span key={t} className="flex items-center gap-1"><span className={cn("h-2.5 w-2.5 rounded-sm", color[t])} />{t}</span>)}
        </div>
      </div>

      {vista === "agenda" ? (
        <ul className="panel divide-y">
          {eventos.filter((e) => new Date(e.fecha_inicio) >= addDays(new Date(), -1)).map((e) => (
            <li key={e.id} className="flex cursor-pointer items-center gap-4 px-4 py-3 hover:bg-accent/50" onClick={() => setEdit(e)}>
              <span className="w-28 font-mono text-xs">{format(new Date(e.fecha_inicio), "EEE dd/MM HH:mm", { locale: es })}</span>
              <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", color[e.tipo_evento] ?? color["Tarea Despacho"])}>{e.tipo_evento}</span>
              <span className={cn("flex-1 text-sm", e.realizada && "text-muted-foreground line-through")}>{e.titulo}</span>
              <span className="text-xs text-muted-foreground">{nombreCentro(e.centro_id)}</span>
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
                <div className="space-y-1">
                  {delDia(d).map((e) => (
                    <button key={e.id} type="button" onClick={() => setEdit(e)} className={cn("block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px]", color[e.tipo_evento] ?? color["Tarea Despacho"], e.realizada && "opacity-50 line-through")}>
                      {format(new Date(e.fecha_inicio), "HH:mm")} {e.titulo}
                    </button>
                  ))}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}
      <EditorEvento ev={edit} onClose={() => setEdit(null)} />
    </div>
  );
}

function EditorEvento({ ev, onClose }: { ev: Partial<Evento> | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: centros = [] } = useQuery(centrosQuery);
  const [f, setF] = useState<Partial<Evento>>({});
  const [lastEv, setLastEv] = useState<Partial<Evento> | null>(null);
  if (ev !== lastEv) {
    setLastEv(ev);
    if (ev) { const fi = ev.fecha_inicio ?? ""; setF({ ...ev, fecha_inicio: fi.includes("Z") || fi.includes("+") ? format(new Date(fi), "yyyy-MM-dd'T'HH:mm") : fi }); }
  }
  const esVencimiento = !!f.tramite_id;

  async function guardar() {
    if (!f.titulo?.trim() || !f.fecha_inicio) { toast.error("Título y fecha obligatorios"); return; }
    const payload = {
      titulo: f.titulo, tipo_evento: f.tipo_evento ?? "Visita a Centro", centro_id: f.centro_id ?? null,
      fecha_inicio: new Date(f.fecha_inicio).toISOString(), realizada: !!f.realizada, notas_visita: f.notas_visita ?? null,
    };
    const { error } = f.id ? await supabase.from("agenda_eventos").update(payload).eq("id", f.id) : await supabase.from("agenda_eventos").insert(payload);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["eventos"] });
    onClose();
  }
  async function borrar() {
    if (!f.id) return;
    await supabase.from("agenda_eventos").delete().eq("id", f.id);
    qc.invalidateQueries({ queryKey: ["eventos"] });
    onClose();
  }

  return (
    <Dialog open={!!ev} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{f.id ? "Editar evento" : "Nuevo evento"}</DialogTitle></DialogHeader>
        {esVencimiento && <p className="rounded bg-late-soft p-2 text-xs text-late">Vencimiento generado automáticamente desde un trámite. Cambia la fecha límite en el módulo de Trámites.</p>}
        <div className="grid gap-3">
          <div className="space-y-1.5"><Label>Título</Label><Input value={f.titulo ?? ""} onChange={(e) => setF({ ...f, titulo: e.target.value })} disabled={esVencimiento} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Tipo</Label>
              <Select value={f.tipo_evento ?? "Visita a Centro"} onValueChange={(v) => setF({ ...f, tipo_evento: v })} disabled={esVencimiento}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS_EVENTO.filter((t) => esVencimiento || t !== "Vencimiento Trámite").map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Fecha y hora</Label><Input type="datetime-local" value={f.fecha_inicio ?? ""} onChange={(e) => setF({ ...f, fecha_inicio: e.target.value })} disabled={esVencimiento} /></div>
          </div>
          <div className="space-y-1.5"><Label>Centro</Label>
            <Select value={f.centro_id ?? SIN} onValueChange={(v) => setF({ ...f, centro_id: v === SIN ? null : v })} disabled={esVencimiento}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={SIN}>Sin centro</SelectItem>{centros.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
            </Select>
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
            {f.id && <Button variant="ghost" onClick={borrar}>Eliminar</Button>}
            <Button onClick={guardar}>Guardar</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
