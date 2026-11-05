import type { Centro, Evento } from "@/lib/queries";

/** Opción del desplegable para un centro que no está en la lista del inspector. */
export const OTRO_CENTRO = "__otro";
/** Opción del desplegable para un evento sin centro. */
export const SIN_CENTRO = "__none";

/** Los dos campos son opcionales porque los formularios los rellenan poco a poco. */
type EventoCentro = Partial<Pick<Evento, "centro_id" | "centro_texto">>;
type ListaCentros = Pick<Centro, "id" | "nombre" | "codigo_centro" | "localidad">[];

export type FichaCentro = {
  nombre: string;
  codigo_centro: string;
  localidad: string;
  /** true cuando el centro se ha escrito a mano porque no estaba en la lista. */
  externo: boolean;
};

/** Nombre visible del centro de un evento: el de la lista o el escrito a mano. */
export function nombreCentroEvento(evento: EventoCentro, centros: ListaCentros): string {
  return centros.find((c) => c.id === evento.centro_id)?.nombre ?? evento.centro_texto?.trim() ?? "";
}

/** Ficha que se usa en pantalla y en el PDF. null si el evento no tiene centro. */
export function fichaCentroEvento(evento: EventoCentro, centros: ListaCentros): FichaCentro | null {
  const centro = centros.find((c) => c.id === evento.centro_id);
  if (centro) {
    return { nombre: centro.nombre, codigo_centro: centro.codigo_centro ?? "", localidad: centro.localidad ?? "", externo: false };
  }
  const escrito = evento.centro_texto?.trim() ?? "";
  return escrito ? { nombre: escrito, codigo_centro: "", localidad: "", externo: true } : null;
}

/** Valor que se guarda en centro_texto: solo cuenta si no se ha elegido un centro de la lista. */
export function centroTextoGuardado(evento: EventoCentro): string {
  return evento.centro_id ? "" : evento.centro_texto?.trim() ?? "";
}
