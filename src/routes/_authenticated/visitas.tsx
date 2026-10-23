import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, FilePenLine, Pencil, Search, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditorVisita } from "@/components/editor-visita";
import { centrosQuery, eventosQuery, type Evento } from "@/lib/queries";
import { esVisita, resenaCompleta } from "@/lib/visitas";

export const Route = createFileRoute("/_authenticated/visitas")({
  head: () => ({ meta: [{ title: "Registro de Visitas · SIE-CLM" }, { name: "description", content: "Visitas a centros de Albacete, reseñas y documentos de Inspección Educativa." }, { property: "og:title", content: "Registro de Visitas · SIE-CLM" }, { property: "og:description", content: "Registro de visitas, reseñas y seguimiento de los centros educativos de Albacete." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: async ({ context }) => { await Promise.all([context.queryClient.ensureQueryData(eventosQuery), context.queryClient.ensureQueryData(centrosQuery)]); },
  component: VisitasPage,
});

function VisitasPage() {
  const { data: eventos } = useSuspenseQuery(eventosQuery);
  const { data: centros } = useSuspenseQuery(centrosQuery);
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("todas");
  const [edit, setEdit] = useState<{ visita: Partial<Evento>; resena: boolean } | null>(null);
  const visitas = eventos.filter(esVisita).filter((v) => estado === "todas" || (estado === "realizadas" ? v.realizada : !v.realizada)).filter((v) => `${v.titulo} ${centros.find((c) => c.id === v.centro_id)?.nombre ?? ""}`.toLocaleLowerCase("es").includes(busqueda.toLocaleLowerCase("es"))).sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));
  return <div>
    <PageHeader eyebrow="Inspección Educativa · Albacete" title="Registro de Visitas"><Button onClick={() => setEdit({ visita: { fecha_inicio: format(new Date(), "yyyy-MM-dd'T'09:00"), titulo: "" }, resena: false })}><Plus className="h-4 w-4" />Nueva visita</Button></PageHeader>
    <div className="mb-5 flex flex-wrap items-center gap-3"><div className="relative min-w-0 flex-1 sm:max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar visitas" className="pl-9" placeholder="Buscar centro u objetivo…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></div><Tabs value={estado} onValueChange={setEstado}><TabsList><TabsTrigger value="todas">Todas</TabsTrigger><TabsTrigger value="previstas">Previstas</TabsTrigger><TabsTrigger value="realizadas">Realizadas</TabsTrigger></TabsList></Tabs><span className="ml-auto text-xs text-muted-foreground">{visitas.length} visitas</span></div>
    <div className="divide-y border-y">
      {visitas.map((v) => { const c = centros.find((centro) => centro.id === v.centro_id); return <article key={v.id} className="flex flex-wrap items-center gap-4 py-5">
        <div className="min-w-0 flex-1 basis-64"><div className="mb-1 flex flex-wrap items-center gap-3"><span className="flex items-center gap-1 font-mono text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{format(new Date(v.fecha_inicio), "dd MMM yyyy · HH:mm", { locale: es })}</span><span className={v.realizada ? "text-xs font-semibold text-ok" : "text-xs font-semibold text-warn"}>{v.realizada ? "Realizada" : "Prevista"}</span></div><h2 className="font-serif text-lg font-semibold text-primary">{c?.nombre ?? "Centro pendiente de asignar"}</h2><p className="break-words text-sm">{v.titulo}</p><p className="mt-1 text-xs text-muted-foreground">{v.inspector_visita} · {resenaCompleta(v) ? "Reseña completa" : "Reseña pendiente"}</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" size="icon" aria-label={`Editar visita ${v.titulo}`} title="Editar visita" onClick={() => setEdit({ visita: v, resena: false })}><Pencil className="h-4 w-4" /></Button><Button variant="outline" onClick={() => setEdit({ visita: v, resena: true })}><FilePenLine className="h-4 w-4" />{resenaCompleta(v) ? "Ver reseña" : "Registrar reseña"}</Button></div>
      </article>; })}
      {!visitas.length && <p className="py-12 text-center text-sm text-muted-foreground">No hay visitas para esta selección.</p>}
    </div>
    {edit && <EditorVisita visita={edit.visita} centros={centros} resena={edit.resena} onClose={() => setEdit(null)} />}
  </div>;
}