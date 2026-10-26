import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { allChecklistsQuery, centrosQuery } from "@/lib/queries";
import { CATEGORIAS, ETIQUETA_CATEGORIA, generarRequerimiento, type Categoria, type ItemChecklist } from "@/lib/checklists";
import { cn } from "@/lib/utils";
import { useConfiguracion } from "@/lib/configuracion";
import { documentoPresentado } from "@/lib/documentacion-estado";

export const Route = createFileRoute("/_authenticated/checklists")({
  validateSearch: (s: Record<string, unknown>): { centro?: string } => (typeof s["centro"] === "string" ? { centro: s["centro"] } : {}),
  head: () => ({ meta: [{ title: "Documentación de Centros · SIE-CLM" }, { name: "description", content: "Control de la documentación presentada por cada centro." }, { property: "og:title", content: "Documentación de Centros · SIE-CLM" }, { property: "og:description", content: "Control de la documentación presentada por cada centro." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ChecklistsPage,
});

const CURSO = "2026/2027";
const ESTADOS_DOC = ["Presentado", "Subsanar", "Pendiente"] as const;
type EstadoDoc = (typeof ESTADOS_DOC)[number];

function aEstadoDoc(global: string | null | undefined): EstadoDoc {
  if (global === "Conforme" || global === "Presentado") return "Presentado";
  if (global === "Requiere subsanación" || global === "Subsanar") return "Subsanar";
  return "Pendiente";
}

const puntoEstado: Record<EstadoDoc, string> = {
  Presentado: "bg-ok",
  Subsanar: "bg-late",
  Pendiente: "bg-muted-foreground/40",
};
const botonEstado: Record<EstadoDoc, string> = {
  Presentado: "bg-ok text-primary-foreground border-ok",
  Subsanar: "bg-late text-primary-foreground border-late",
  Pendiente: "bg-warn-soft text-warn border-warn/40",
};

function ChecklistsPage() {
  const qc = useQueryClient();
  const [guardando, setGuardando] = useState<string | null>(null);
  const [presentado, setPresentado] = useState<{ centroId: string; doc: Categoria; revision: number } | null>(null);
  const { centro } = Route.useSearch();
  const navigate = useNavigate();
  const { data: centros = [] } = useQuery(centrosQuery);
  const { data: registros = [] } = useQuery(allChecklistsQuery);
  const centroId = centro ?? centros[0]?.id;

  const estadoDe = (centroIdQ: string, doc: Categoria): EstadoDoc =>
    aEstadoDoc(registros.find((r) => r.centro_id === centroIdQ && r.curso_escolar === CURSO && r.categoria === doc)?.estado_global);

  async function marcarPresentado(centroId: string, doc: Categoria) {
    if (guardando) return;
    setGuardando(`${centroId}:${doc}`);
    try {
      const { error } = await supabase.from("checklists_centro").upsert(documentoPresentado(centroId, CURSO, doc), { onConflict: "centro_id,curso_escolar,categoria" });
      if (error) throw error;
      setPresentado({ centroId, doc, revision: Date.now() });
      await qc.invalidateQueries({ queryKey: ["checklists"] });
      toast.success(`${ETIQUETA_CATEGORIA[doc]} presentado`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo marcar el documento como presentado");
    } finally { setGuardando(null); }
  }

  return (
    <div>
      <PageHeader eyebrow={`Módulo 3 · Curso ${CURSO}`} title="Documentación de los Centros" />
      <p className="mb-4 text-sm text-muted-foreground">
        Control de la documentación que debe presentar cada centro. Pulsa sobre un centro para abrir su ficha y anotar observaciones por documento.
      </p>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/60 text-left">
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:eyebrow">
              <th>Centro</th>
              {CATEGORIAS.map((c) => <th key={c} className="text-center">{ETIQUETA_CATEGORIA[c]}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y">
            {centros.map((c) => (
              <tr key={c.id} className={cn("cursor-pointer hover:bg-accent/50 [&>td]:px-3 [&>td]:py-2.5", c.id === centroId && "bg-accent/60")} onClick={() => navigate({ to: "/checklists", search: { centro: c.id } })}>
                <td className="font-medium">{c.nombre}</td>
                {CATEGORIAS.map((doc) => {
                  const e = estadoDe(c.id, doc);
                  return (
                    <td key={doc} className="text-center">
                      <Button variant="ghost" size="sm" aria-label={`${ETIQUETA_CATEGORIA[doc]} de ${c.nombre}: ${e}`} title={e === "Presentado" ? "Documento presentado" : "Marcar como presentado"} disabled={guardando !== null} onClick={(event) => { event.stopPropagation(); if (e !== "Presentado") void marcarPresentado(c.id, doc); }} className={cn("h-7 gap-1.5 px-2 py-0.5 text-[11px] font-semibold", e === "Presentado" ? "bg-ok-soft text-ok hover:bg-ok-soft hover:text-ok" : e === "Subsanar" ? "bg-late-soft text-late" : "bg-muted text-muted-foreground")}>
                        <span className={cn("h-2 w-2 rounded-full", puntoEstado[e])} />
                        {e}
                      </Button>
                    </td>
                  );
                })}
              </tr>
            ))}
            {!centros.length && <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">No hay centros dados de alta.</td></tr>}
          </tbody>
        </table>
      </div>

      {centroId && <FichaCentro key={centroId} centroId={centroId} presentado={presentado} />}
    </div>
  );
}

type DocFicha = { estado: EstadoDoc; obs: string };

function FichaCentro({ centroId, presentado }: { centroId: string; presentado: { centroId: string; doc: Categoria; revision: number } | null }) {
  const config = useConfiguracion();
  const qc = useQueryClient();
  const { data: centros = [] } = useQuery(centrosQuery);
  const { data: registros = [] } = useQuery(allChecklistsQuery);
  const centro = centros.find((c) => c.id === centroId);
  const [fecha, setFecha] = useState("");
  const [docs, setDocs] = useState<Record<Categoria, DocFicha>>(() => {
    const ini = {} as Record<Categoria, DocFicha>;
    for (const cat of CATEGORIAS) {
      const reg = registros.find((r) => r.centro_id === centroId && r.curso_escolar === CURSO && r.categoria === cat);
      ini[cat] = { estado: aEstadoDoc(reg?.estado_global), obs: reg?.observaciones_inspector ?? "" };
    }
    return ini;
  });
  const [texto, setTexto] = useState("");
  const editados = useRef(new Set<Categoria>());

  useEffect(() => {
    setDocs((prev) => {
      const siguiente = { ...prev };
      for (const cat of CATEGORIAS) {
        if (editados.current.has(cat)) continue;
        const reg = registros.find((r) => r.centro_id === centroId && r.curso_escolar === CURSO && r.categoria === cat);
        siguiente[cat] = { estado: aEstadoDoc(reg?.estado_global), obs: reg?.observaciones_inspector ?? "" };
      }
      return siguiente;
    });
  }, [registros, centroId]);

  useEffect(() => {
    if (presentado?.centroId !== centroId) return;
    const cat = presentado.doc;
    setDocs((prev) => ({ ...prev, [cat]: { ...prev[cat], estado: "Presentado" } }));
  }, [presentado, centroId]);

  const upd = (cat: Categoria, p: Partial<DocFicha>) => {
    editados.current.add(cat);
    setDocs((prev) => ({ ...prev, [cat]: { ...prev[cat], ...p } }));
  };
  const presentados = CATEGORIAS.filter((c) => docs[c].estado === "Presentado").length;

  async function guardar() {
    const filas = CATEGORIAS.map((cat) => ({
      centro_id: centroId,
      curso_escolar: CURSO,
      categoria: cat,
      estado_global: docs[cat].estado,
      observaciones_inspector: docs[cat].obs,
      fecha_supervision: fecha || null,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("checklists_centro").upsert(filas, { onConflict: "centro_id,curso_escolar,categoria" });
    if (error) { toast.error(error.message); return; }
    editados.current.clear();
    qc.invalidateQueries({ queryKey: ["checklists"] });
    toast.success("Ficha guardada");
  }

  function generar(tipo: "requerimiento" | "acta") {
    if (!centro) return;
    const items: ItemChecklist[] = CATEGORIAS.map((cat) => ({
      texto: ETIQUETA_CATEGORIA[cat],
      estado: docs[cat].estado === "Presentado" ? "Conforme" : docs[cat].estado,
      obs: docs[cat].obs,
    }));
    setTexto(generarRequerimiento(centro, "Plan de Mejora", items, "", tipo, config));
  }

  if (!centro) return null;
  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-5">
      <section className="panel xl:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            <p className="eyebrow">Ficha del centro</p>
            <p className="font-semibold">{centro.nombre} <span className="font-mono text-xs text-muted-foreground">({centro.codigo_centro})</span></p>
            <p className="text-xs text-muted-foreground">{presentados} de {CATEGORIAS.length} documentos presentados</p>
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1"><Label className="text-xs">Fecha de revisión</Label><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
            <Button onClick={guardar}>Guardar ficha</Button>
          </div>
        </div>
        <ul className="divide-y">
          {CATEGORIAS.map((cat) => (
            <li key={cat} className="space-y-2 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="flex-1 text-sm font-medium">{ETIQUETA_CATEGORIA[cat]}</p>
                <div className="flex overflow-hidden rounded border">
                  {ESTADOS_DOC.map((e) => (
                    <button key={e} type="button" onClick={() => upd(cat, { estado: e })} className={cn("border-l px-2.5 py-1 text-xs font-semibold first:border-l-0", docs[cat].estado === e ? botonEstado[e] : "bg-card text-muted-foreground hover:bg-muted")}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <Input className="h-8 text-xs" placeholder="Indicaciones u observaciones sobre este documento" value={docs[cat].obs} onChange={(e) => upd(cat, { obs: e.target.value })} />
            </li>
          ))}
        </ul>
      </section>
      <section className="panel space-y-3 p-4 xl:col-span-2">
        <h3 className="font-semibold">Documento generado</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="crimson" size="sm" onClick={() => generar("requerimiento")}><FileText className="h-3.5 w-3.5" /> Generar requerimiento</Button>
          <Button variant="outline" size="sm" onClick={() => generar("acta")}><FileText className="h-3.5 w-3.5" /> Generar acta</Button>
          <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(texto); toast.success("Copiado"); }}><Copy className="h-3.5 w-3.5" /> Copiar</Button>
        </div>
        <Textarea rows={22} className="font-mono text-xs" value={texto} onChange={(e) => setTexto(e.target.value)} />
      </section>
    </div>
  );
}
