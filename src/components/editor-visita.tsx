import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Check, FileDown, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useConfiguracion, nombreInspector } from "@/lib/configuracion";
import { resenaCompleta } from "@/lib/visitas";
import { descargarResenaPDF } from "@/lib/resena-pdf";
import type { Centro, Evento } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function EditorVisita({ visita, centros, resena = false, onClose }: { visita: Partial<Evento>; centros: Centro[]; resena?: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const config = useConfiguracion();
  const [f, setF] = useState(() => ({ ...visita, fecha_inicio: format(new Date(visita.fecha_inicio ?? new Date()), "yyyy-MM-dd'T'HH:mm"), inspector_visita: visita.inspector_visita ?? nombreInspector(config), cargo_visita: visita.cargo_visita ?? config.cargo, provincia_visita: visita.provincia_visita ?? config.provincia, descripcion_visita: visita.descripcion_visita ?? "", problemas_visita: visita.problemas_visita ?? "", recomendaciones_visita: visita.recomendaciones_visita ?? "" }));
  const [busy, setBusy] = useState(false);
  const centro = centros.find((c) => c.id === f.centro_id);
  async function guardar(pdf = false) {
    if (!f.titulo?.trim() || !f.fecha_inicio || !centro || !f.inspector_visita.trim()) { toast.error("Indica centro, objetivo, fecha e inspector"); return; }
    if (pdf && !resenaCompleta(f)) { toast.error("Completa los tres apartados de la reseña"); return; }
    setBusy(true);
    try {
      const payload = { titulo: f.titulo.trim(), tipo_evento: "Visita a Centro", centro_id: centro.id, fecha_inicio: new Date(f.fecha_inicio).toISOString(), realizada: !!f.realizada, inspector_visita: f.inspector_visita.trim(), cargo_visita: f.cargo_visita, provincia_visita: f.provincia_visita, descripcion_visita: f.descripcion_visita, problemas_visita: f.problemas_visita, recomendaciones_visita: f.recomendaciones_visita };
      const result = f.id ? await supabase.from("agenda_eventos").update(payload).eq("id", f.id).select().single() : await supabase.from("agenda_eventos").insert(payload).select().single();
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ["eventos"] });
      setF((prev) => ({ ...prev, id: result.data.id }));
      if (pdf) { await descargarResenaPDF(result.data, centro); toast.success("Reseña guardada y PDF creado"); }
      else { toast.success("Visita guardada"); onClose(); }
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se ha podido guardar la visita"); }
    finally { setBusy(false); }
  }
  async function borrar() {
    if (!f.id || !window.confirm("¿Eliminar esta visita y su reseña también de la agenda?")) return;
    setBusy(true);
    const { error } = await supabase.from("agenda_eventos").delete().eq("id", f.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["eventos"] }); onClose();
  }
  return <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>{resena ? "Reseña de visita" : f.id ? "Ficha de visita" : "Nueva visita"}</DialogTitle></DialogHeader>
      <fieldset disabled={busy} className="space-y-4">
        <div className="space-y-1.5"><Label htmlFor="visita-centro">Centro</Label><Select value={f.centro_id ?? ""} onValueChange={(value) => setF({ ...f, centro_id: value })}><SelectTrigger id="visita-centro"><SelectValue placeholder="Seleccionar centro" /></SelectTrigger><SelectContent>{centros.map((c) => <SelectItem value={c.id} key={c.id}>{c.nombre}</SelectItem>)}</SelectContent></Select></div>
        {centro && <p className="text-xs text-muted-foreground">{centro.codigo_centro} · {centro.localidad}</p>}
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="visita-fecha">Fecha y hora de visita</Label><Input id="visita-fecha" type="datetime-local" value={f.fecha_inicio} onChange={(e) => setF({ ...f, fecha_inicio: e.target.value })} /></div><div className="space-y-1.5"><Label htmlFor="visita-inspector">Inspector</Label><Input id="visita-inspector" value={f.inspector_visita} onChange={(e) => setF({ ...f, inspector_visita: e.target.value })} /></div></div>
        <div className="space-y-1.5"><Label htmlFor="visita-objetivo">Objetivo de la visita</Label><Input id="visita-objetivo" value={f.titulo ?? ""} onChange={(e) => setF({ ...f, titulo: e.target.value })} /></div>
        <Button variant={f.realizada ? "default" : "outline"} onClick={() => setF({ ...f, realizada: !f.realizada })}><Check className="h-4 w-4" />{f.realizada ? "Realizada" : "Marcar como realizada"}</Button>
        {resena && <div className="space-y-4 border-t pt-4">{([
          ["descripcion_visita", "Breve Descripción de la visita"], ["problemas_visita", "Principales Problemas Detectados"], ["recomendaciones_visita", "Recomendaciones Formuladas"],
        ] as const).map(([key, label]) => <div className="space-y-1.5" key={key}><Label htmlFor={key}>{label}</Label><Textarea id={key} rows={4} value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} /></div>)}</div>}
      </fieldset>
      <DialogFooter className="flex-wrap gap-2">
        {f.id && <Button variant="ghost" disabled={busy} onClick={borrar}><Trash2 className="h-4 w-4" />Eliminar</Button>}
        {resena && <Button variant="outline" disabled={busy || !resenaCompleta(f)} onClick={() => guardar(true)}><FileDown className="h-4 w-4" />Crear PDF</Button>}
        <Button disabled={busy} onClick={() => guardar()}><Save className="h-4 w-4" />{busy ? "Guardando…" : "Guardar"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}