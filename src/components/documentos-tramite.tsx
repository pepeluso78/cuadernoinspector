import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIAS_DOCUMENTO, DOCUMENTOS_BUCKET, rutaDocumento } from "@/lib/documentos";

export function DocumentosTramite({ tramiteId }: { tramiteId: string }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [categoria, setCategoria] = useState<string>("Otros documentos");
  const [ocupado, setOcupado] = useState(false);
  const { data: documentos = [], isPending, error } = useQuery({
    queryKey: ["documentos-tramite", tramiteId],
    queryFn: async () => {
      const { data, error } = await supabase.from("documentos_tramite").select("*").eq("tramite_id", tramiteId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const recargar = () => qc.invalidateQueries({ queryKey: ["documentos-tramite", tramiteId] });
  async function subir(files: FileList | null) {
    if (!files?.length) return;
    setOcupado(true);
    let subidos = 0;
    try {
      for (const file of Array.from(files)) {
        const ruta = rutaDocumento(tramiteId, crypto.randomUUID(), file.name);
        const mime = file.type || "application/octet-stream";
        const { error: uploadError } = await supabase.storage.from(DOCUMENTOS_BUCKET).upload(ruta, file, { contentType: mime });
        if (uploadError) { toast.error(`No se pudo subir ${file.name}: ${uploadError.message}`); continue; }
        const { error } = await supabase.from("documentos_tramite").insert({ tramite_id: tramiteId, nombre: file.name, ruta, mime_type: mime, tamano: file.size, categoria });
        if (error) { await supabase.storage.from(DOCUMENTOS_BUCKET).remove([ruta]); toast.error(`No se pudo guardar ${file.name}: ${error.message}`); continue; }
        subidos++;
      }
      if (subidos) toast.success(`${subidos} documento(s) añadido(s)`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudieron subir los documentos"); }
    finally { setOcupado(false); if (input.current) input.current.value = ""; recargar(); }
  }
  async function descargar(ruta: string, nombre: string) {
    const { data, error } = await supabase.storage.from(DOCUMENTOS_BUCKET).download(ruta);
    if (error) { toast.error(error.message); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a"); a.href = url; a.download = nombre; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function eliminar(id: string, ruta: string, nombre: string) {
    if (!confirm(`¿Eliminar el documento «${nombre}»?`)) return;
    setOcupado(true);
    try {
      const { error: storageError } = await supabase.storage.from(DOCUMENTOS_BUCKET).remove([ruta]);
      if (storageError) throw storageError;
      const { error } = await supabase.from("documentos_tramite").delete().eq("id", id);
      if (error) throw error;
      toast.success("Documento eliminado"); recargar();
    } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo eliminar el documento"); }
    finally { setOcupado(false); }
  }
  return <section className="mt-5 space-y-3 border-y py-4" aria-label="Documentos adjuntos">
    <h3 className="flex items-center gap-2 font-semibold"><Paperclip className="h-4 w-4" /> Documentos adjuntos</h3>
    <div className="flex flex-wrap items-center gap-2">
      <Select value={categoria} onValueChange={setCategoria} disabled={ocupado}>
        <SelectTrigger className="w-48" aria-label="Tipo de documento"><SelectValue /></SelectTrigger>
        <SelectContent>{CATEGORIAS_DOCUMENTO.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
      </Select>
      <input type="file" multiple ref={input} className="hidden" aria-label="Seleccionar documentos" onChange={(e) => subir(e.target.files)} />
      <Button variant="outline" disabled={ocupado} onClick={() => input.current?.click()}><Upload className="h-4 w-4" /> {ocupado ? "Guardando…" : "Subir documentos"}</Button>
    </div>
    {isPending ? <p className="text-sm text-muted-foreground">Cargando documentos…</p> : error ? <p className="text-sm text-destructive">No se pudieron cargar los documentos. <Button variant="link" onClick={recargar}>Reintentar</Button></p> : !documentos.length ? <p className="text-sm text-muted-foreground">Sin documentos adjuntos.</p> : <ul className="divide-y">
      {documentos.map((d) => <li key={d.id} className="flex items-center gap-2 py-2">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{d.nombre}</p><p className="text-xs text-muted-foreground">{d.categoria} · {d.tamano < 1024 * 1024 ? `${Math.ceil(d.tamano / 1024)} KB` : `${(d.tamano / (1024 * 1024)).toFixed(1)} MB`} · {new Date(d.created_at).toLocaleDateString("es-ES")}</p></div>
        <Button size="icon" variant="ghost" title={`Descargar ${d.nombre}`} aria-label={`Descargar ${d.nombre}`} onClick={() => descargar(d.ruta, d.nombre)}><Download className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" title={`Eliminar ${d.nombre}`} aria-label={`Eliminar ${d.nombre}`} disabled={ocupado} onClick={() => eliminar(d.id, d.ruta, d.nombre)}><Trash2 className="h-4 w-4" /></Button>
      </li>)}
    </ul>}
  </section>;
}