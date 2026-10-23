import { addDays, endOfMonth, endOfWeek, format, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import type { Centro, Evento, Guardia } from "./queries";

export type VistaAgenda = "mes" | "semana" | "agenda";
export type EntradaAgenda = {
  id: string; fecha: string; hora: string; titulo: string; tipo: string;
  centro: string; realizada: boolean; guardia: boolean;
};

export function periodoAgenda(vista: VistaAgenda, referencia: Date, hoy = new Date()) {
  const inicio = vista === "agenda" ? startOfDay(hoy) : startOfWeek(vista === "mes" ? startOfMonth(referencia) : referencia, { weekStartsOn: 1 });
  const fin = vista === "agenda" ? null : endOfWeek(vista === "mes" ? endOfMonth(referencia) : referencia, { weekStartsOn: 1 });
  const titulo = vista === "agenda" ? `Eventos pendientes desde el ${format(inicio, "dd/MM/yyyy")}`
    : vista === "mes" ? format(referencia, "MMMM yyyy", { locale: es })
    : `${format(inicio, "dd/MM/yyyy")} – ${format(fin ?? inicio, "dd/MM/yyyy")}`;
  const dias: Date[] = [];
  if (fin) for (let d = inicio; d <= fin; d = addDays(d, 1)) dias.push(d);
  return { inicio, fin, titulo, dias };
}

export function entradasAgenda(eventos: Pick<Evento, "id" | "fecha_inicio" | "titulo" | "tipo_evento" | "centro_id" | "realizada">[], guardias: Pick<Guardia, "id" | "fecha" | "persona_nombre" | "centro_id" | "centro_texto">[], centros: Pick<Centro, "id" | "nombre">[], vista: VistaAgenda, referencia: Date, hoy = new Date()): EntradaAgenda[] {
  const { inicio, fin } = periodoAgenda(vista, referencia, hoy);
  const dentro = (d: Date) => d >= inicio && (!fin || d <= fin);
  const centro = (id: string | null) => centros.find((c) => c.id === id)?.nombre ?? "";
  const entradas: EntradaAgenda[] = eventos.filter((e) => dentro(new Date(e.fecha_inicio)) && (vista !== "agenda" || !e.realizada)).map((e) => ({
    id: e.id, fecha: format(new Date(e.fecha_inicio), "yyyy-MM-dd"), hora: format(new Date(e.fecha_inicio), "HH:mm"),
    titulo: e.titulo, tipo: e.tipo_evento, centro: centro(e.centro_id), realizada: !!e.realizada, guardia: false,
  }));
  // Guardias are records of attention already given, not pending tasks.
  if (vista !== "agenda") entradas.push(...guardias.filter((g) => dentro(new Date(`${g.fecha}T12:00:00`))).map((g) => ({
    id: g.id, fecha: g.fecha, hora: "", titulo: g.persona_nombre, tipo: "Guardia", centro: centro(g.centro_id) || g.centro_texto || "",
    realizada: true, guardia: true,
  })));
  return entradas.sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`) || a.titulo.localeCompare(b.titulo, "es"));
}