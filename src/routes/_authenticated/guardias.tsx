import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, FileDown, Phone, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { centrosQuery, guardiasQuery } from "@/lib/queries";
import { useConfiguracion, nombreInspector } from "@/lib/configuracion";
import { descargarGuardiaPDF, type Guardia } from "@/lib/guardia-pdf";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/guardias")({
  head: () => ({ meta: [{ title: "Guardias · SIE-CLM" }, { name: "description", content: "Registro de incidencias atendidas en las guardias de Inspección." }, { property: "og:title", content: "Guardias · SIE-CLM" }, { property: "og:description", content: "Registro de incidencias atendidas en las guardias de Inspección." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: GuardiasPage,
});

const SIN = "__none";
const hoy = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

function GuardiasPage() {
  const { data: guardias = [] } = useQuery(guardiasQuery);
  const { data: centros = [] } = useQuery(centrosQuery);
  const [edit, setEdit] = useState<Partial<Guardia> | null>(null);
  const nombreCentro = (g: Partial<Guardia>) => centros.find((c) => c.id === g.centro_id)?.nombre ?? g.centro_texto ?? "";
  return (
    <div>
      <PageHeader eyebrow="Inspección Educativa" title="Guardias">
        <Button onClick={() => setEdit({ fecha: hoy(), modalidad: "Teléfono" })}><Plus className="h-4 w-4" /> Nueva incidencia</Button>
      </PageHeader>
      {guardias.length === 0 ? <p className="panel p-6 text-sm text-muted-foreground">Aún no hay incidencias de guardia registradas.</p> : (
        <ul className="panel divide-y">
          {guardias.map((g) => (
            <li key={g.id} className="flex cursor-pointer flex-wrap items-center gap-4 px-4 py-3 hover:bg-accent/50" onClick={() => setEdit(g)}>
              <span className="w-24 font-mono text-xs">{g.fecha.split("-").reverse().join("/")}</span>
              <span className="flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">{g.modalidad === "Presencial" ? <Users className="h-3 w-3" /> : <Phone className="h-3 w-3" />}{g.modalidad}</span>
              <span className="flex-1 text-sm">{g.persona_nombre} <span className="text-muted-foreground">· {g.incidencia.slice(0, 80)}</span></span>
              <span className="text-xs text-muted-foreground">{nombreCentro(g)}</span>
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); descargarGuardiaPDF(g, nombreCentro(g)).catch((err) => toast.error(err.message)); }}><FileDown className="h-4 w-4" /> PDF</Button>
            </li>
          ))}
        </ul>
      )}
      <EditorGuardia g={edit} onClose={() => setEdit(null)} nombreCentro={nombreCentro} />
    </div>
  );
}

function EditorGuardia({ g, onClose, nombreCentro }: { g: Partial<Guardia> | null; onClose: () => void; nombreCentro: (g: Partial<Guardia>) => string }) {
  const qc = useQueryClient();
  const config = useConfiguracion();
  const { data: centros = [] } = useQuery(centrosQuery);
  const [f, setF] = useState<Partial<Guardia>>({});
  const [last, setLast] = useState<Partial<Guardia> | null>(null);
  if (g !== last) { setLast(g); if (g) setF(g); }
  const inspector = f.inspector_guardia || nombreInspector(config);

  async function guardar() {
    if (!f.fecha || !f.persona_nombre?.trim() || !f.incidencia?.trim()) { toast.error("Fecha, persona atendida e incidencia son obligatorias"); return; }
    const payload = {
      fecha: f.fecha, persona_nombre: f.persona_nombre, persona_condicion: f.persona_condicion ?? "", persona_contacto: f.persona_contacto ?? "",
      modalidad: f.modalidad ?? "Teléfono", inspector_centro: f.inspector_centro ?? "", centro_id: f.centro_id ?? null, centro_texto: f.centro_texto ?? "",
      incidencia: f.incidencia, respuesta: f.respuesta ?? "",
      ...(!f.id ? { inspector_guardia: nombreInspector(config), cargo_guardia: config.cargo, provincia_guardia: config.provincia } : {}),
    };
    const r = f.id ? await supabase.from("guardias").update(payload).eq("id", f.id).select().single() : await supabase.from("guardias").insert(payload).select().single();
    if (r.error) { toast.error(r.error.message); return; }
    qc.invalidateQueries({ queryKey: ["guardias"] });
    toast.success("Incidencia guardada");
    setF(r.data); setLast(r.data);
  }
  async function borrar() {
    if (!f.id || !confirm("¿Eliminar esta incidencia?")) return;
    const { error } = await supabase.from("guardias").delete().eq("id", f.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["guardias"] });
    onClose();
  }

  return (
    <Dialog open={!!g} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{f.id ? "Incidencia de guardia" : "Nueva incidencia de guardia"}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Fecha de la guardia</Label><Input type="date" value={f.fecha ?? ""} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Atención</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["Presencial", "Teléfono"] as const).map((m) => (
                  <Button key={m} type="button" variant={f.modalidad === m ? "default" : "outline"} className={cn("gap-1")} onClick={() => setF({ ...f, modalidad: m })}>
                    {m === "Presencial" ? <Users className="h-4 w-4" /> : <Phone className="h-4 w-4" />}{m}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <fieldset className="grid gap-3 rounded border p-3 sm:grid-cols-3">
            <legend className="eyebrow px-1">Persona atendida</legend>
            <div className="space-y-1.5"><Label>Nombre y apellidos</Label><Input value={f.persona_nombre ?? ""} onChange={(e) => setF({ ...f, persona_nombre: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Condición</Label><Input placeholder="Familia, docente, director/a…" value={f.persona_condicion ?? ""} onChange={(e) => setF({ ...f, persona_condicion: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Teléfono / correo</Label><Input value={f.persona_contacto ?? ""} onChange={(e) => setF({ ...f, persona_contacto: e.target.value })} /></div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Inspector/a de guardia</Label><Input value={inspector} disabled /></div>
            <div className="space-y-1.5"><Label>Inspector/a del centro atendido</Label><Input value={f.inspector_centro ?? ""} onChange={(e) => setF({ ...f, inspector_centro: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Centro educativo</Label>
            <Select value={f.centro_id ?? SIN} onValueChange={(v) => setF({ ...f, centro_id: v === SIN ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={SIN}>Otro centro (escribir)</SelectItem>{centros.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
            </Select>
            {!f.centro_id && <Input placeholder="Nombre del centro" value={f.centro_texto ?? ""} onChange={(e) => setF({ ...f, centro_texto: e.target.value })} />}
          </div>
          <div className="space-y-1.5"><Label>Incidencia tratada</Label><Textarea rows={5} value={f.incidencia ?? ""} onChange={(e) => setF({ ...f, incidencia: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Respuesta dada por el inspector de guardia</Label><Textarea rows={5} value={f.respuesta ?? ""} onChange={(e) => setF({ ...f, respuesta: e.target.value })} /></div>
        </div>
        <DialogFooter className="gap-2">
          {f.id && <Button variant="ghost" onClick={borrar}>Eliminar</Button>}
          {f.id && <Button variant="outline" onClick={() => descargarGuardiaPDF(f as Guardia, nombreCentro(f)).catch((e) => toast.error(e.message))}><FileDown className="h-4 w-4" /> Reporte de Guardia PDF</Button>}
          <Button onClick={guardar}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
