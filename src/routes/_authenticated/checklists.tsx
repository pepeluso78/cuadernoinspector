import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { centrosQuery, checklistsQuery } from "@/lib/queries";
import { CATEGORIAS, ETIQUETA_CATEGORIA, estadoGlobal, generarRequerimiento, itemsIniciales, type Categoria, type EstadoItem, type ItemChecklist } from "@/lib/checklists";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/checklists")({
  validateSearch: (s: Record<string, unknown>) => ({ centro: typeof s.centro === "string" ? s.centro : undefined }),
  head: () => ({ meta: [{ title: "Checklists de Supervisión · SIE-CLM" }, { name: "description", content: "Supervisión por centro en 5 áreas." }] }),
  component: ChecklistsPage,
});

const CURSO = "2026/2027";
const ESTADOS: EstadoItem[] = ["Conforme", "Subsanar", "Pendiente"];
const estiloEstado: Record<EstadoItem, string> = {
  Conforme: "bg-ok text-primary-foreground border-ok",
  Subsanar: "bg-late text-primary-foreground border-late",
  Pendiente: "bg-warn-soft text-warn border-warn/40",
};

function ChecklistsPage() {
  const { centro } = Route.useSearch();
  const navigate = useNavigate();
  const { data: centros = [] } = useQuery(centrosQuery);
  const centroId = centro ?? centros[0]?.id;
  const [cat, setCat] = useState<Categoria>("Plan de Mejora");

  return (
    <div>
      <PageHeader eyebrow={`Módulo 3 · Curso ${CURSO}`} title="Checklists de Supervisión">
        <Select value={centroId ?? ""} onValueChange={(v) => navigate({ to: "/checklists", search: { centro: v } })}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Selecciona centro" /></SelectTrigger>
          <SelectContent>{centros.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
        </Select>
      </PageHeader>
      {centroId && <PanelCentro centroId={centroId} cat={cat} setCat={setCat} />}
    </div>
  );
}

function PanelCentro({ centroId, cat, setCat }: { centroId: string; cat: Categoria; setCat: (c: Categoria) => void }) {
  const { data: registros = [] } = useQuery(checklistsQuery(centroId));
  const reg = (c: Categoria) => registros.find((r) => r.categoria === c && r.curso_escolar === CURSO);
  return (
    <>
      <Tabs value={cat} onValueChange={(v) => setCat(v as Categoria)}>
        <TabsList className="h-auto flex-wrap">
          {CATEGORIAS.map((c) => {
            const e = reg(c)?.estado_global ?? "Pendiente";
            return (
              <TabsTrigger key={c} value={c} className="gap-2">
                <span className={cn("h-2 w-2 rounded-full", e === "Conforme" ? "bg-ok" : e === "Requiere subsanación" ? "bg-late" : e === "En revisión" ? "bg-warn" : "bg-muted-foreground/40")} />
                {ETIQUETA_CATEGORIA[c]}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
      <EditorChecklist key={`${centroId}-${cat}-${reg(cat)?.id ?? "nuevo"}`} centroId={centroId} cat={cat} registro={reg(cat)} />
    </>
  );
}

function EditorChecklist({ centroId, cat, registro }: { centroId: string; cat: Categoria; registro?: { items_verificacion: unknown; observaciones_inspector: string | null; requerimiento_generado: string | null; fecha_supervision: string | null } }) {
  const qc = useQueryClient();
  const { data: centros = [] } = useQuery(centrosQuery);
  const centro = centros.find((c) => c.id === centroId);
  const guardados = Array.isArray(registro?.items_verificacion) ? (registro!.items_verificacion as ItemChecklist[]) : [];
  const [items, setItems] = useState<ItemChecklist[]>(guardados.length ? guardados : itemsIniciales(cat));
  const [obs, setObs] = useState(registro?.observaciones_inspector ?? "");
  const [texto, setTexto] = useState(registro?.requerimiento_generado ?? "");
  const [fecha, setFecha] = useState(registro?.fecha_supervision ?? "");
  const [nuevo, setNuevo] = useState("");
  useEffect(() => {}, []);

  const upd = (i: number, p: Partial<ItemChecklist>) => setItems(items.map((it, j) => (j === i ? { ...it, ...p } : it)));
  const global = estadoGlobal(items);

  async function guardar() {
    const { error } = await supabase.from("checklists_centro").upsert(
      { centro_id: centroId, curso_escolar: CURSO, categoria: cat, items_verificacion: items, observaciones_inspector: obs, requerimiento_generado: texto, fecha_supervision: fecha || null, estado_global: global, updated_at: new Date().toISOString() },
      { onConflict: "centro_id,curso_escolar,categoria" },
    );
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["checklists"] });
    toast.success("Checklist guardada");
  }

  return (
    <div className="mt-4 grid gap-6 xl:grid-cols-5">
      <section className="panel xl:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            <p className="eyebrow">Estado global</p>
            <p className="font-semibold">{global}</p>
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1"><Label className="text-xs">Fecha supervisión</Label><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
            <Button onClick={guardar}>Guardar</Button>
          </div>
        </div>
        <ul className="divide-y">
          {items.map((it, i) => (
            <li key={i} className="space-y-2 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="flex-1 text-sm font-medium">{it.texto}</p>
                <div className="flex overflow-hidden rounded border">
                  {ESTADOS.map((e) => (
                    <button key={e} type="button" onClick={() => upd(i, { estado: e })} className={cn("border-l px-2.5 py-1 text-xs font-semibold first:border-l-0", it.estado === e ? estiloEstado[e] : "bg-card text-muted-foreground hover:bg-muted")}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <Input className="h-8 text-xs" placeholder="Observaciones del ítem" value={it.obs} onChange={(e) => upd(i, { obs: e.target.value })} />
            </li>
          ))}
          <li className="flex gap-2 px-4 py-3">
            <Input placeholder="Añadir ítem de verificación" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
            <Button variant="outline" onClick={() => { if (nuevo.trim()) { setItems([...items, { texto: nuevo, estado: "Pendiente", obs: "" }]); setNuevo(""); } }}>Añadir</Button>
          </li>
        </ul>
        <div className="space-y-1.5 border-t p-4">
          <Label>Observaciones del inspector</Label>
          <Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
      </section>
      <section className="panel space-y-3 p-4 xl:col-span-2">
        <h3 className="font-semibold">Documento generado</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="crimson" size="sm" disabled={!centro} onClick={() => setTexto(generarRequerimiento(centro!, cat, items, obs, "requerimiento"))}><FileText className="h-3.5 w-3.5" /> Generar requerimiento</Button>
          <Button variant="outline" size="sm" disabled={!centro} onClick={() => setTexto(generarRequerimiento(centro!, cat, items, obs, "acta"))}><FileText className="h-3.5 w-3.5" /> Generar acta</Button>
          <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(texto); toast.success("Copiado"); }}><Copy className="h-3.5 w-3.5" /> Copiar</Button>
        </div>
        <Textarea rows={22} className="font-mono text-xs" value={texto} onChange={(e) => setTexto(e.target.value)} />
      </section>
    </div>
  );
}
