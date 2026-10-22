import { cn } from "@/lib/utils";
import { diasRestantes, semaforo, textoCuentaAtras } from "@/lib/plazos";

const estilos = {
  verde: "bg-ok-soft text-ok border-ok/30",
  amarillo: "bg-warn-soft text-warn border-warn/40",
  rojo: "bg-late-soft text-late border-late/40",
};
const punto = { verde: "bg-ok", amarillo: "bg-warn", rojo: "bg-late" };

export function CuentaAtras({ fechaLimite, cerrado }: { fechaLimite: string; cerrado?: boolean }) {
  if (cerrado)
    return <span className="inline-flex items-center rounded border bg-muted px-2 py-0.5 text-xs text-muted-foreground">Respondido</span>;
  const d = diasRestantes(fechaLimite);
  const s = semaforo(d);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-semibold", estilos[s])}>
      <span className={cn("h-2 w-2 rounded-full", punto[s])} />
      {textoCuentaAtras(d)}
    </span>
  );
}
