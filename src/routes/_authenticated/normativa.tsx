import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Library, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { normativaQuery } from "@/lib/queries";
import { BIBLIOTECA_URL } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/normativa")({
  head: () => ({ meta: [{ title: "Biblioteca Normativa CLM · SIE-CLM" }, { name: "description", content: "Repositorio personal de normativa con citas para informes." }] }),
  component: NormativaPage,
});

const BLOQUES = [
  { value: "Inspección", label: "Inspección Educativa" },
  { value: "Autoridad y Convivencia", label: "Autoridad del Profesorado y Convivencia" },
  { value: "Inicio de Curso y Organización", label: "Instrucciones Inicio de Curso y Organización" },
  { value: "Evaluación", label: "Evaluación CLM (Todas las etapas)" },
];

function NormativaPage() {
  const qc = useQueryClient();
  const { data: normas = [] } = useQuery(normativaQuery);
  const [bloque, setBloque] = useState(BLOQUES[0].value);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ rango_normativo: "", titulo_norma: "", etapa_educativa: "Todas", url_enlace: "", cita_informes: "" });
  const lista = normas.filter((n) => n.bloque_tematico === bloque && `${n.titulo_norma} ${n.cita_informes} ${n.etapa_educativa}`.toLowerCase().includes(q.toLowerCase()));

  async function add() {
    if (!f.titulo_norma || !f.rango_normativo) return toast.error("Rango y título obligatorios");
    const { error } = await supabase.from("normativa_clm").insert({ ...f, bloque_tematico: bloque, url_enlace: f.url_enlace || BIBLIOTECA_URL });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["normativa"] });
    setOpen(false);
  }

  return (
    <div>
      <PageHeader eyebrow="Módulo 5" title="Biblioteca Normativa CLM" />
      <a href={BIBLIOTECA_URL} target="_blank" rel="noreferrer" className="mb-6 flex items-center gap-4 rounded-lg bg-primary p-5 text-primary-foreground shadow hover:bg-primary/90">
        <div className="flex h-12 w-12 items-center justify-center rounded bg-crimson"><Library className="h-6 w-6" /></div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest opacity-70">Acceso directo oficial</p>
          <p className="font-serif text-xl font-semibold">Biblioteca Normativa de la JCCM — Educación</p>
          <p className="text-xs opacity-70">educacion.castillalamancha.es/biblioteca-normativa</p>
        </div>
        <ExternalLink className="h-5 w-5" />
      </a>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={bloque} onValueChange={setBloque}>
          <TabsList className="h-auto flex-wrap">{BLOQUES.map((b) => <TabsTrigger key={b.value} value={b.value}>{b.label}</TabsTrigger>)}</TabsList>
        </Tabs>
        <div className="relative ml-auto w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar norma" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Añadir norma</Button>
      </div>

      <div className="space-y-3">
        {lista.map((n) => (
          <article key={n.id} className="panel p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">{n.rango_normativo}</span>
              <span className="text-xs text-muted-foreground">{n.etapa_educativa}</span>
            </div>
            <h3 className="mt-2 font-semibold">{n.titulo_norma}</h3>
            {n.cita_informes && <blockquote className="mt-2 border-l-2 border-crimson pl-3 font-serif text-sm italic text-muted-foreground">{n.cita_informes}</blockquote>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="crimson" onClick={() => { navigator.clipboard.writeText(n.cita_informes ?? n.titulo_norma); toast.success("Cita copiada para el informe"); }}><Copy className="h-3.5 w-3.5" /> Copiar cita para informe</Button>
              <Button size="sm" variant="outline" asChild><a href={n.url_enlace} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /> Abrir norma</a></Button>
            </div>
          </article>
        ))}
        {!lista.length && <p className="py-10 text-center text-muted-foreground">Sin resultados.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Añadir norma a “{BLOQUES.find((b) => b.value === bloque)?.label}”</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5"><Label>Rango normativo</Label><Input value={f.rango_normativo} onChange={(e) => setF({ ...f, rango_normativo: e.target.value })} placeholder="Orden CLM" /></div>
            <div className="space-y-1.5"><Label>Título</Label><Textarea rows={2} value={f.titulo_norma} onChange={(e) => setF({ ...f, titulo_norma: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Etapa</Label><Input value={f.etapa_educativa} onChange={(e) => setF({ ...f, etapa_educativa: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Enlace</Label><Input value={f.url_enlace} onChange={(e) => setF({ ...f, url_enlace: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Cita para informes</Label><Textarea rows={3} value={f.cita_informes} onChange={(e) => setF({ ...f, cita_informes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={add}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
