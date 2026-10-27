import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Mail, Phone, FileSpreadsheet } from "lucide-react";
import { parsearCentros } from "@/lib/importar-centros";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { centrosQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/centros/")({
  head: () => ({ meta: [{ title: "Mis Centros · SIE-CLM" }, { name: "description", content: "Directorio de centros y equipos directivos." }, { property: "og:title", content: "Mis Centros · SIE-CLM" }, { property: "og:description", content: "Directorio de centros y equipos directivos." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: CentrosPage,
});

function CentrosPage() {
  const { data: centros = [] } = useQuery(centrosQuery);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ codigo_centro: "", nombre: "", tipo_centro: "CEIP", localidad: "Albacete", email_centro: "", telefono: "" });
  const lista = centros.filter((c) => `${c.nombre} ${c.codigo_centro} ${c.localidad}`.toLowerCase().includes(q.toLowerCase()));

  const fileRef = useRef<HTMLInputElement>(null);
  const [cargando, setCargando] = useState(false);
  async function importarExcel(file: File) {
    setCargando(true);
    try {
      const { readSheet } = await import("read-excel-file/browser");
      const centrosExcel = parsearCentros(await readSheet(file) as unknown[][]);
      if (!centrosExcel.length) { toast.error("No se han encontrado centros con código y nombre en el Excel"); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Sesión no válida"); return; }
      const { error } = await supabase.from("centros").upsert(centrosExcel.map((c) => ({ ...c, user_id: user.id })), { onConflict: "user_id,codigo_centro" });
      if (error) { toast.error(error.message); return; }
      qc.invalidateQueries({ queryKey: ["centros"] });
      toast.success(`${centrosExcel.length} centros cargados`);
    } catch (e) {
      toast.error("No se pudo leer el archivo: " + (e as Error).message);
    } finally {
      setCargando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function crear() {
    if (!f.codigo_centro || !f.nombre) { toast.error("Código y nombre son obligatorios"); return; }
    const { error } = await supabase.from("centros").insert(f);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["centros"] });
    setOpen(false);
    toast.success("Centro añadido");
  }

  return (
    <div>
      <PageHeader eyebrow="Módulo 2" title="Mis Centros y Equipos Directivos">
        <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importarExcel(f); }} />
        <Button variant="outline" disabled={cargando} onClick={() => fileRef.current?.click()}><FileSpreadsheet className="h-4 w-4" /> {cargando ? "Cargando…" : "Cargar centros desde Excel"}</Button>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Añadir centro</Button>
      </PageHeader>
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Buscar centro" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!centros.length && (
        <div className="panel mb-4 p-6 text-center text-sm text-muted-foreground">
          Todavía no tienes centros. Pulsa «Cargar centros desde Excel» con las columnas: localidad, nombre del centro, código, teléfono, email, director/a, jefe/a de estudios y secretario/a.
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lista.map((c) => (
          <Link key={c.id} to="/centros/$id" params={{ id: c.id }} className="panel group block p-4 hover:border-primary/40">
            <div className="flex items-start justify-between gap-2">
              <span className="rounded bg-primary px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary-foreground">{c.tipo_centro}</span>
              <span className="font-mono text-xs text-muted-foreground">{c.codigo_centro}</span>
            </div>
            <h3 className="mt-3 font-serif text-lg font-semibold text-primary group-hover:underline">{c.nombre}</h3>
            <p className="text-sm text-muted-foreground">{c.localidad}</p>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{c.email_centro || "—"}</p>
              <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{c.telefono || "—"}</p>
            </div>
            <p className="mt-3 border-t pt-2 text-xs"><span className="eyebrow">Director/a</span> {c.director_nombre || "—"}</p>
          </Link>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo centro</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["codigo_centro", "nombre", "tipo_centro", "localidad", "email_centro", "telefono"] as const).map((k) => (
              <div key={k} className="space-y-1.5">
                <Label>{{ codigo_centro: "Código", nombre: "Nombre", tipo_centro: "Tipo (CEIP, IES, CRA…)", localidad: "Localidad", email_centro: "Correo oficial", telefono: "Teléfono" }[k]}</Label>
                <Input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
              </div>
            ))}
          </div>
          <DialogFooter><Button onClick={crear}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
