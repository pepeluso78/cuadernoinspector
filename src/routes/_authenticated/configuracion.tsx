import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, KeyRound, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CARGOS, PROVINCIAS, TEMAS, configuracionQuery, configuracionSchema, servicioProvincial, type Configuracion } from "@/lib/configuracion";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/configuracion")({
 head: () => ({ meta: [{ title: "Configuración · SIE-CLM" }, { name: "description", content: "Datos personales, acceso, correo de trámites y apariencia del cuaderno de inspección." }, { property: "og:title", content: "Configuración · SIE-CLM" }, { property: "og:description", content: "Preferencias de identidad, correo y apariencia de SIE-CLM." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
 loader: ({ context }) => context.queryClient.ensureQueryData(configuracionQuery),
 component: ConfiguracionPage,
});
function ConfiguracionPage() {
 const { data } = useSuspenseQuery(configuracionQuery);
 const qc = useQueryClient();
 const [f, setF] = useState<Configuracion>(data);
 const [busy, setBusy] = useState(false);
 const [email, setEmail] = useState("");
 const [currentPassword, setCurrentPassword] = useState("");
 const [password, setPassword] = useState("");
 const [confirm, setConfirm] = useState("");
 useEffect(() => { supabase.auth.getUser().then(({ data: auth }) => { setEmail(auth.user?.email ?? ""); if (auth.user) setF((prev) => ({ ...prev, user_id: auth.user!.id })); }); }, []);
 async function guardar(e: React.FormEvent) {
  e.preventDefault(); const parsed = configuracionSchema.safeParse(f);
  if (!parsed.success) { toast.error("Revisa los datos personales y el correo de referencia"); return; }
  setBusy(true);
  const { error } = await supabase.from("configuracion_aplicacion").upsert(parsed.data, { onConflict: "user_id" });
  setBusy(false);
  if (error) { toast.error(error.message); return; }
  qc.setQueryData(configuracionQuery.queryKey, parsed.data);
  await qc.invalidateQueries({ queryKey: ["configuracion"] }); toast.success("Configuración guardada");
 }
 async function cambiarEmail(e: React.FormEvent) {
  e.preventDefault(); setBusy(true);
  const { error } = await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: window.location.origin });
  setBusy(false);
  if (error) { toast.error(error.message); return; }
  toast.success("Solicitud enviada: revisa el correo para confirmar el cambio de usuario");
 }
 async function cambiarPassword(e: React.FormEvent) {
  e.preventDefault();
  if (password !== confirm) { toast.error("Las contraseñas no coinciden"); return; }
  setBusy(true);
  const { error } = await supabase.auth.updateUser({ password, current_password: currentPassword });
  setBusy(false);
  if (error) { toast.error(error.message); return; }
  setPassword(""); setConfirm(""); setCurrentPassword(""); toast.success("Contraseña actualizada");
 }
 return <div className="max-w-4xl">
  <PageHeader eyebrow="Preferencias" title="Configuración" />
  <form onSubmit={guardar} className="space-y-8">
   <section className="space-y-4 border-b pb-6"><h2 className="font-serif text-xl font-semibold text-primary">Datos personales</h2>
    <div className="grid gap-4 sm:grid-cols-2">{([['nombre','Nombre'],['apellidos','Apellidos']] as const).map(([key,label]) => <div className="space-y-1.5" key={key}><Label htmlFor={key}>{label}</Label><Input id={key} required value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} /></div>)}</div>
    <div className="space-y-1.5"><Label htmlFor="cargo">Cargo</Label><Select value={f.cargo} onValueChange={(cargo: Configuracion['cargo']) => setF({ ...f,cargo })}><SelectTrigger id="cargo"><SelectValue /></SelectTrigger><SelectContent>{CARGOS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
    <div className="space-y-1.5"><Label htmlFor="provincia">Servicio provincial</Label><Select value={f.provincia} onValueChange={(provincia: Configuracion['provincia']) => setF({ ...f,provincia })}><SelectTrigger id="provincia" className="h-auto min-h-10 [&>span]:!line-clamp-none [&>span]:!whitespace-normal [&>span]:text-left"><SelectValue /></SelectTrigger><SelectContent>{PROVINCIAS.map((p) => <SelectItem key={p} value={p}>{servicioProvincial(p)}</SelectItem>)}</SelectContent></Select></div>
   </section>
   <section className="space-y-4 border-b pb-6"><h2 className="font-serif text-xl font-semibold text-primary">Correo para crear trámites</h2><div className="space-y-1.5"><Label htmlFor="correo-referencia">Correo de referencia (remitente de los reenvíos)</Label><Input id="correo-referencia" type="email" required value={f.correo_referencia} onChange={(e) => setF({ ...f, correo_referencia: e.target.value })} /></div></section>
   <section className="space-y-4"><h2 className="font-serif text-xl font-semibold text-primary">Apariencia</h2><div className="space-y-1.5"><Label htmlFor="tema">Tema</Label><Select value={f.tema} onValueChange={(tema: Configuracion['tema']) => setF({ ...f,tema })}><SelectTrigger id="tema"><SelectValue /></SelectTrigger><SelectContent>{TEMAS.map((t) => <SelectItem key={t} value={t}>{({ institucional: 'Institucional', claro: 'Claro', oscuro: 'Oscuro', verde: 'Verde' })[t]}</SelectItem>)}</SelectContent></Select></div></section>
   <Button disabled={busy} type="submit"><Save className="h-4 w-4" />Guardar configuración</Button>
  </form>
  <section className="mt-10 space-y-6 border-t pt-6"><h2 className="font-serif text-xl font-semibold text-primary">Acceso a la aplicación</h2>
   <form onSubmit={cambiarEmail} className="space-y-3"><Label htmlFor="email-usuario">Usuario (correo de acceso)</Label><Input id="email-usuario" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /><Button type="submit" variant="outline" disabled={busy}><Mail className="h-4 w-4" />Cambiar usuario</Button></form>
   <form onSubmit={cambiarPassword} className="space-y-3">{([['actual','Contraseña actual',currentPassword,setCurrentPassword],['nueva','Nueva contraseña',password,setPassword],['repetir','Repetir nueva contraseña',confirm,setConfirm]] as const).map(([id,label,value,setter]) => <div className="space-y-1.5" key={id}><Label htmlFor={id}>{label}</Label><Input id={id} required type="password" autoComplete={id === 'actual' ? 'current-password' : 'new-password'} value={value} onChange={(e) => setter(e.target.value)} /></div>)}<Button type="submit" variant="outline" disabled={busy}><KeyRound className="h-4 w-4" />Cambiar contraseña</Button></form>
  </section>
 </div>;
}