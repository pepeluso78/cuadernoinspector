import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INSPECTOR } from "@/lib/constants";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceso · SIE-CLM Inspección Educativa" },
      { name: "description", content: "Acceso al Cuaderno de Inspección Educativa de Albacete." },
      { property: "og:title", content: "Acceso · SIE-CLM" },
      { property: "og:description", content: "Acceso al Cuaderno de Inspección Educativa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Revisa tu correo para confirmar la cuenta.");
        setMode("in");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function oauth(p: "google" | "lovable") {
    const r = await lovable.auth.signInWithOAuth(p, { redirect_uri: window.location.origin });
    if (r.error) return toast.error(r.error.message);
    if (r.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1.5 bg-crimson" />
          <span className="text-sm font-semibold uppercase tracking-widest">Castilla-La Mancha</span>
        </div>
        <div>
          <p className="eyebrow !text-sidebar-foreground/60">Servicio de Inspección · Albacete</p>
          <h1 className="mt-3 font-serif text-5xl leading-tight text-sidebar-accent-foreground">
            Cuaderno de Inspección Educativa
          </h1>
          <p className="mt-4 max-w-md text-sidebar-foreground/70">
            Trámites con control de plazos, centros, supervisión y normativa en un solo lugar.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">{INSPECTOR.unidad}</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <ShieldCheck className="h-8 w-8 text-crimson" />
            <h2 className="mt-3 text-2xl font-semibold">{mode === "in" ? "Iniciar sesión" : "Crear cuenta"}</h2>
            <p className="text-sm text-muted-foreground">SIE-CLM · {INSPECTOR.nombre}</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={INSPECTOR.email} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">Contraseña</Label>
              <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === "in" ? "Entrar" : "Registrarse"}
            </Button>
          </form>
          <div className="space-y-2">
            <Button variant="outline" className="w-full" onClick={() => oauth("google")}>Continuar con Google</Button>
            <button type="button" className="lovable-auth-button w-full" onClick={() => oauth("lovable")}>
              Continue with Lovable
            </button>
          </div>
          <button type="button" className="text-sm text-muted-foreground underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "¿Primera vez? Crear cuenta" : "Ya tengo cuenta"}
          </button>
        </div>
      </div>
    </div>
  );
}
