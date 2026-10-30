import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, CalendarDays, ClipboardCheck, FileDown, FilePenLine, Pencil, Search, Star, Trash2 } from "lucide-react";
import { exportarCuadernoPDF } from "@/lib/exportar-pdf";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditorVisita } from "@/components/editor-visita";
import { centroQuery, notasQuery, visitasCentroQuery, type Centro, type Evento } from "@/lib/queries";
import { CATEGORIAS_NOTA } from "@/lib/constants";
import { resenaCompleta } from "@/lib/visitas";
import { useConfiguracion } from "@/lib/configuracion";

export const Route = createFileRoute("/_authenticated/centros/$id")({
  head: () => ({ meta: [{ title: "Ficha de centro · SIE-CLM" }, { name: "description", content: "Ficha, equipo directivo y cuaderno de campo del centro." }, { property: "og:title", content: "Ficha de centro · SIE-CLM" }, { property: "og:description", content: "Ficha, equipo directivo y cuaderno de campo del centro." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: CentroPage,
});

const CARGOS = [
  { key: "director", label: "Director/a" },
  { key: "jefe_estudios", label: "Jefe/a de Estudios" },
  { key: "secretario", label: "Secretario/a" },
] as const;

function CentroPage() {
  const config = useConfiguracion();
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: centro } = useQuery(centroQuery(id));
  const { data: notas = [] } = useQuery(notasQuery(id));
  const [c, setC] = useState<Centro | null>(null);
  useEffect(() => { if (centro) setC(centro); }, [centro]);
  if (!c) return <p className="text-muted-foreground">Cargando…</p>;
  const set = (k: keyof Centro, v: string) => setC({ ...c, [k]: v || null } as Centro);

  async function guardar() {
    const { id: _id, created_at, ...rest } = c!;
    void _id; void created_at;
    const { error } = await supabase.from("centros").update(rest).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["centros"] });
    toast.success("Ficha guardada");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/centros" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Centros</Link>
          <p className="eyebrow">{c.tipo_centro} · {c.codigo_centro} · {c.localidad}</p>
          <h1 className="font-serif text-3xl font-semibold text-primary">{c.nombre}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { if (!exportarCuadernoPDF(c, notas, config)) toast.error("Permite las ventanas emergentes para exportar"); }}><FileDown className="h-4 w-4" /> Exportar a PDF</Button>
          <Button variant="outline" asChild><Link to="/checklists" search={{ centro: id }}><ClipboardCheck className="h-4 w-4" /> Checklists</Link></Button>
          <Button onClick={guardar}>Guardar ficha</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="panel space-y-3 p-4">
          <h2 className="font-semibold">Datos del centro</h2>
          <F label="Código" v={c.codigo_centro} on={(v) => set("codigo_centro", v)} />
          <F label="Nombre" v={c.nombre} on={(v) => set("nombre", v)} />
          <F label="Correo oficial" v={c.email_centro} on={(v) => set("email_centro", v)} />
          <F label="Teléfono" v={c.telefono} on={(v) => set("telefono", v)} />
          <F label="Localidad" v={c.localidad} on={(v) => set("localidad", v)} />
        </section>
        <section className="panel p-4 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Equipo Directivo</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {CARGOS.map(({ key, label }) => (
              <div key={key} className="space-y-2 rounded border-l-4 border-l-crimson bg-muted/40 p-3">
                <p className="eyebrow">{label}</p>
                <F label="Nombre" v={c[`${key}_nombre`]} on={(v) => set(`${key}_nombre`, v)} />
                <F label="Correo" v={c[`${key}_email`]} on={(v) => set(`${key}_email`, v)} />
                <F label="Fecha nombramiento" type="date" v={c[`${key}_fecha_nombramiento`]} on={(v) => set(`${key}_fecha_nombramiento`, v)} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <VisitasCentro centroId={id} centro={c} />
      <CuadernoCampo centroId={id} centro={c} />
    </div>
  );
}

function F({ label, v, on, type = "text" }: { label: string; v: string | null; on: (v: string) => void; type?: string }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label><Input type={type} value={v ?? ""} onChange={(e) => on(e.target.value)} /></div>;
}

function VisitasCentro({ centroId, centro }: { centroId: string; centro: Centro }) {
  const { data: visitas = [] } = useQuery(visitasCentroQuery(centroId));
  const [estado, setEstado] = useState("todas");
  const [edit, setEdit] = useState<{ visita: Partial<Evento>; resena: boolean } | null>(null);
  const lista = visitas.filter((v) => estado === "todas" || (estado === "realizadas" ? v.realizada : !v.realizada));
  const realizadas = visitas.filter((v) => v.realizada).length;

  return (
    <section className="panel p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-semibold text-primary">Visitas a este centro</h2>
          <p className="text-xs text-muted-foreground">{visitas.length} registradas · {realizadas} realizadas</p>
        </div>
        <Tabs value={estado} onValueChange={setEstado}>
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="realizadas">Realizadas</TabsTrigger>
            <TabsTrigger value="previstas">Previstas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <ul className="divide-y">
        {lista.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center gap-4 py-3">
            <div className="min-w-0 flex-1 basis-64">
              <div className="mb-1 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{format(new Date(v.fecha_inicio), "dd/MM/yyyy · HH:mm", { locale: es })}</span>
                <span className={v.realizada ? "text-xs font-semibold text-ok" : "text-xs font-semibold text-warn"}>{v.realizada ? "Realizada" : "Prevista"}</span>
                <span className="text-xs text-muted-foreground">{resenaCompleta(v) ? "Reseña completa" : "Reseña pendiente"}</span>
              </div>
              <p className="break-words font-semibold">{v.titulo}</p>
              <p className="text-xs text-muted-foreground">{v.inspector_visita}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="icon" aria-label={`Editar visita ${v.titulo}`} title="Editar visita" onClick={() => setEdit({ visita: v, resena: false })}><Pencil className="h-4 w-4" /></Button>
              <Button variant="outline" onClick={() => setEdit({ visita: v, resena: true })}><FilePenLine className="h-4 w-4" />{resenaCompleta(v) ? "Ver reseña" : "Registrar reseña"}</Button>
            </div>
          </li>
        ))}
        {!lista.length && <li className="py-8 text-center text-sm text-muted-foreground">{visitas.length ? "Sin visitas en esta selección." : "Sin visitas registradas en este centro."}</li>}
      </ul>
      {edit && <EditorVisita visita={edit.visita} centros={[centro]} resena={edit.resena} onClose={() => setEdit(null)} />}
    </section>
  );
}

function CuadernoCampo({ centroId, centro }: { centroId: string; centro: Centro }) {
  const qc = useQueryClient();
  const config = useConfiguracion();
  const { data: notas = [] } = useQuery(notasQuery(centroId));
  const [tab, setTab] = useState("Incidencia");
  const [q, setQ] = useState("");
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const lista = notas.filter((n) => n.categoria === tab && `${n.titulo} ${n.contenido}`.toLowerCase().includes(q.toLowerCase()));

  function cancelar() { setEditId(null); setTitulo(""); setContenido(""); }
  async function add() {
    if (!titulo.trim()) { toast.error("Añade un título"); return; }
    const { error } = editId
      ? await supabase.from("notas_centro").update({ titulo, contenido }).eq("id", editId)
      : await supabase.from("notas_centro").insert({ centro_id: centroId, categoria: tab, titulo, contenido });
    if (error) { toast.error(error.message); return; }
    if (editId) toast.success("Nota actualizada");
    cancelar();
    qc.invalidateQueries({ queryKey: ["notas", centroId] });
  }
  async function toggle(id: string, imp: boolean) {
    await supabase.from("notas_centro").update({ importante: !imp }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notas", centroId] });
  }
  async function del(id: string) {
    await supabase.from("notas_centro").delete().eq("id", id);
    if (editId === id) cancelar();
    qc.invalidateQueries({ queryKey: ["notas", centroId] });
  }
  const etiqueta: Record<string, string> = { Incidencia: "Incidencias", "Conversación": "Conversaciones", Documento: "Documentos", Otros: "Otros aspectos" };

  return (
    <section className="panel p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-xl font-semibold text-primary">Cuaderno de Campo</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar en notas" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => { if (!exportarCuadernoPDF(centro, notas, config)) toast.error("Permite las ventanas emergentes para exportar"); }}><FileDown className="h-4 w-4" /> PDF de todas las notas</Button>
        </div>
      </div>
      <Tabs value={tab} onValueChange={(v) => { setTab(v); cancelar(); }}>
        <TabsList>
          {CATEGORIAS_NOTA.map((c) => <TabsTrigger key={c} value={c}>{etiqueta[c]} <span className="ml-1 font-mono text-[10px] opacity-60">{notas.filter((n) => n.categoria === c).length}</span></TabsTrigger>)}
        </TabsList>
      </Tabs>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-2">
          {editId && <p className="eyebrow text-crimson">Editando nota</p>}
          <Input placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <Textarea rows={editId ? 10 : 5} placeholder="Contenido (fecha y hora se registran automáticamente)" value={contenido} onChange={(e) => setContenido(e.target.value)} />
          <Button className="w-full" onClick={add}>{editId ? "Guardar cambios" : `Añadir a ${etiqueta[tab]}`}</Button>
          {editId && <Button variant="outline" className="w-full" onClick={cancelar}>Cancelar edición</Button>}
        </div>
        <ul className="space-y-2 lg:col-span-2">
          {lista.map((n) => (
            <li key={n.id} className="rounded border p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="font-mono text-[11px] text-muted-foreground">{n.fecha_registro && format(new Date(n.fecha_registro), "dd/MM/yyyy · HH:mm", { locale: es })}</p>
                  <p className="font-semibold">{n.titulo}</p>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{n.contenido}</p>
                </div>
                <button type="button" aria-label="Editar nota" title="Editar nota" onClick={() => { setEditId(n.id); setTitulo(n.titulo); setContenido(n.contenido ?? ""); }}><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                <button type="button" aria-label="Marcar importante" onClick={() => toggle(n.id, !!n.importante)}><Star className={`h-4 w-4 ${n.importante ? "fill-crimson text-crimson" : "text-muted-foreground"}`} /></button>
                <button type="button" aria-label="Eliminar nota" onClick={() => del(n.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
              </div>
            </li>
          ))}
          {!lista.length && <li className="py-8 text-center text-sm text-muted-foreground">Sin notas en esta pestaña.</li>}
        </ul>
      </div>
    </section>
  );
}
