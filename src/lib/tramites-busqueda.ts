import { esTramiteCerrado } from "./constants";
import type { Centro, Tramite } from "./queries";

const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();

export function buscarTramites(tramites: Tramite[], centros: Centro[], consulta: string, cerrados: boolean): Tramite[] {
  const palabras = normalizar(consulta).split(/\s+/).filter(Boolean);
  const nombres = new Map(centros.map((centro) => [centro.id, centro.nombre]));
  return tramites.filter((tramite) => {
    if (esTramiteCerrado(tramite.estado) !== cerrados) return false;
    const texto = normalizar([
      tramite.asunto, tramite.numero_registro, tramite.remitente, tramite.origen,
      tramite.descripcion_entrada, tramite.borrador_informe,
      tramite.fecha_entrada, tramite.fecha_limite,
      tramite.centro_id ? nombres.get(tramite.centro_id) : "",
    ].filter(Boolean).join(" "));
    return palabras.every((palabra) => texto.includes(palabra));
  });
}