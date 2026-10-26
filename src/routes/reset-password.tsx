import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Nueva contraseña · SIE-CLM" },
    { name: "description", content: "Restablece tu contraseña de acceso al Cuaderno de Inspección Educativa." },
    { property: "og:title", content: "Nueva contraseña · SIE-CLM" },
    { property: "og:description", content: "Recuperación segura del acceso al Cuaderno de Inspección Educativa." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const recoveryHash = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    const hashError = new URLSearchParams(window.location.hash.slice(1)).get("error");
    if (hashError) setError("El enlace ha caducado o no es válido. Solicita uno nuevo.");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (active && event === "PASSWORD_RECOVERY") setReady(true);
    });
    void supabase.auth.getUser().then(({ data: userData }) => {
      if (!active) return;
      if (recoveryHash && userData.user) setReady(true);
      setChecking(false);
    }).catch(() => { if (active) setChecking(false); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
    if (password !== confirmation) { setError("Las contraseñas no coinciden."); return; }
    setBusy(true);
    setError("");
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      setPassword("");
      setConfirmation("");
      await supabase.auth.signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido cambiar la contraseña.");
    } finally { setBusy(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-background p-6">
    <div className="w-full max-w-sm space-y-6">
      <ShieldCheck className="h-8 w-8 text-crimson" />
      <h1 className="text-2xl font-semibold">Nueva contraseña</h1>
      {checking ? <p className="text-muted-foreground">Comprobando enlace…</p> : done ?
        <p role="status">Contraseña actualizada. Ya puedes iniciar sesión.</p> : ready ?
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="new-password">Nueva contraseña</Label><Input id="new-password" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="confirm-password">Repetir contraseña</Label><Input id="confirm-password" type="password" autoComplete="new-password" required minLength={6} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Guardando…" : "Guardar contraseña"}</Button>
        </form> : <p className="text-muted-foreground">Abre el enlace de restablecimiento que has recibido por correo.</p>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <Button asChild variant="outline" className="w-full"><Link to="/auth">Volver al acceso</Link></Button>
    </div>
  </main>;
}