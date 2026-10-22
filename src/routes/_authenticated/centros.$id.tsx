import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, ClipboardCheck, Search, Star, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { centroQuery, notasQuery, type Centro } from "@/lib/queries";
import { CATEGORIAS_NOTA } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/centros/$id")({
  head: () => ({ meta: [{ title: "Ficha de centro · SIE-CLM" }, { name: "description", content: "Ficha, equipo directivo y cuaderno de campo del centro." }] }),
  component: CentroPage,
});

const CARGOS = [
  { key: "director", label: "Director/a" },
  { key: "jefe_estudios", label: "Jefe/a de Estudios" },
  { key: "secretario", label: "Secretario/a" },
] as const;

function CentroPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: centro } = useQuery(centroQuery(id));
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
        <div className="flex gap-2">
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

      <CuadernoCampo centroId={id} />
    </div>
  );
}

function F({ label, v, on, type = "text" }: { label: string; v: string | null; on: (v: string) => void; type?: string }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label><Input type={type} value={v ?? ""} onChange={(e) => on(e.target.value)} /></div>;
}

function CuadernoCampo({ centroId }: { centroId: string }) {
  const qc = useQueryClient();
  const { data: notas = [] } = useQuery(notasQuery(centroId));
  const [tab, setTab] = useState("Incidencia");
  const [q, setQ] = useState("");
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const lista = notas.filter((n) => n.categoria === tab && `${n.titulo} ${n.contenido}`.toLowerCase().includes(q.toLowerCase()));

  async function add() {
    if (!titulo.trim()) { toast.error("Añade un título"); return; }
    const { error } = await supabase.from("notas_centro").insert({ centro_id: centroId, categoria: tab, titulo, contenido });
    if (error) { toast.error(error.message); return; }
    setTitulo(""); setContenido("");
    qc.invalidateQueries({ queryKey: ["notas", centroId] });
  }
  async function toggle(id: string, imp: boolean) {
    await supabase.from("notas_centro").update({ importante: !imp }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notas", centroId] });
  }
  async function del(id: string) {
    await supabase.from("notas_centro").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["notas", centroId] });
  }
  const etiqueta: Record<string, string> = { Incidencia: "Incidencias", "Conversación": "Conversaciones", Documento: "Documentos", Otros: "Otros aspectos" };

  return (
    <section className="panel p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-xl font-semibold text-primary">Cuaderno de Campo</h2>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar en notas" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {CATEGORIAS_NOTA.map((c) => <TabsTrigger key={c} value={c}>{etiqueta[c]} <span className="ml-1 font-mono text-[10px] opacity-60">{notas.filter((n) => n.categoria === c).length}</span></TabsTrigger>)}
        </TabsList>
      </Tabs>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-2">
          <Input placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <Textarea rows={5} placeholder="Contenido (fecha y hora se registran automáticamente)" value={contenido} onChange={(e) => setContenido(e.target.value)} />
          <Button className="w-full" onClick={add}>Añadir a {etiqueta[tab]}</Button>
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
