import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, CalendarDays, Inbox, School, ExternalLink, Mail } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { CuentaAtras } from "@/components/semaforo";
import { Button } from "@/components/ui/button";
import { centrosQuery, eventosQuery, tramitesQuery, allChecklistsQuery } from "@/lib/queries";
import { diasRestantes, semaforo } from "@/lib/plazos";
import { BIBLIOTECA_URL, BUZON_URL, INSPECTOR } from "@/lib/constants";
import { useConfiguracion } from "@/lib/configuracion";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · SIE-CLM" }, { name: "description", content: "Resumen de trámites, visitas y supervisión." }, { property: "og:title", content: "Dashboard · SIE-CLM" }, { property: "og:description", content: "Resumen de trámites, visitas y supervisión." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Dashboard,
});

function Dashboard() {
  const config = useConfiguracion();
  const { data: tramites = [] } = useQuery(tramitesQuery);
  const { data: centros = [] } = useQuery(centrosQuery);
  const { data: eventos = [] } = useQuery(eventosQuery);
  const { data: checks = [] } = useQuery(allChecklistsQuery);

  const abiertos = tramites.filter((t) => t.estado !== "Respondido / Elevado");
  const cuenta = { verde: 0, amarillo: 0, rojo: 0 };
  abiertos.forEach((t) => t.fecha_limite && cuenta[semaforo(diasRestantes(t.fecha_limite))]++);
  const ahora = Date.now();
  const proximos = eventos.filter((e) => new Date(e.fecha_inicio).getTime() >= ahora - 86400000 && !e.realizada).slice(0, 6);
  const subsanar = checks.filter((c) => c.estado_global === "Requiere subsanación").length;
  const nombreCentro = (id: string | null) => centros.find((c) => c.id === id)?.nombre ?? "—";

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })} title={`Buenos días, ${config.nombre}`}>
        <Button variant="outline" asChild>
          <a href={BUZON_URL} target="_blank" rel="noreferrer"><Mail className="h-4 w-4" /> {config.correo_referencia}</a>
        </Button>
        <Button variant="crimson" asChild>
          <Link to="/tramites" search={{ nuevo: true }}><Inbox className="h-4 w-4" /> Nueva entrada</Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Trámites abiertos" value={abiertos.length} icon={Inbox} />
        <Stat label="Vencidos / vencen hoy" value={cuenta.rojo} icon={AlertTriangle} tone="late" />
        <Stat label="Vencen en 1-3 días" value={cuenta.amarillo} icon={AlertTriangle} tone="warn" />
        <Stat label="Centros asignados" value={centros.length} icon={School} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="panel lg:col-span-3">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold">Trámites por vencimiento</h2>
            <Link to="/tramites" className="text-sm text-primary underline-offset-4 hover:underline">Ver todos</Link>
          </div>
          <ul className="divide-y">
            {abiertos.slice(0, 7).map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.asunto}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.numero_registro} · {t.origen} · {nombreCentro(t.centro_id)}</p>
                </div>
                {t.fecha_limite && <CuentaAtras fechaLimite={t.fecha_limite} />}
              </li>
            ))}
            {!abiertos.length && <li className="px-4 py-8 text-center text-sm text-muted-foreground">Sin trámites pendientes.</li>}
          </ul>
        </section>
        <section className="panel lg:col-span-2">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold">Próximo en agenda</h2>
            <Link to="/agenda" className="text-sm text-primary underline-offset-4 hover:underline">Agenda</Link>
          </div>
          <ul className="divide-y">
            {proximos.map((e) => (
              <li key={e.id} className="flex gap-3 px-4 py-3">
                <div className="w-12 shrink-0 text-center">
                  <p className="font-mono text-lg font-semibold leading-none text-primary">{format(new Date(e.fecha_inicio), "dd")}</p>
                  <p className="text-[10px] uppercase text-muted-foreground">{format(new Date(e.fecha_inicio), "MMM", { locale: es })}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.titulo}</p>
                  <p className="text-xs text-muted-foreground">{e.tipo_evento} · {format(new Date(e.fecha_inicio), "HH:mm")}</p>
                </div>
              </li>
            ))}
            {!proximos.length && <li className="px-4 py-8 text-center text-sm text-muted-foreground"><CalendarDays className="mx-auto mb-2 h-5 w-5" />Nada programado.</li>}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel p-4">
          <p className="eyebrow">Supervisión</p>
          <p className="mt-1 text-sm"><span className="font-mono text-2xl font-semibold text-crimson">{subsanar}</span> checklists requieren subsanación</p>
          <Button variant="link" className="px-0" asChild><Link to="/checklists">Ir a checklists</Link></Button>
        </div>
        <a href={BIBLIOTECA_URL} target="_blank" rel="noreferrer" className="panel flex items-center justify-between p-4 hover:bg-accent">
          <div>
            <p className="eyebrow">Acceso directo</p>
            <p className="mt-1 font-semibold text-primary">Biblioteca Normativa oficial JCCM</p>
          </div>
          <ExternalLink className="h-5 w-5 text-crimson" />
        </a>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Inbox; tone?: "late" | "warn" }) {
  const c = tone === "late" ? "text-late" : tone === "warn" ? "text-warn" : "text-primary";
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        <Icon className={`h-4 w-4 ${c}`} />
      </div>
      <p className={`mt-2 font-mono text-3xl font-semibold ${c}`}>{value}</p>
    </div>
  );
}
