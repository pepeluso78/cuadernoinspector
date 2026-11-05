/** Cuentas de la app autorizadas a usar el calendario de Outlook conectado por el propietario. */
export const CUENTAS_OUTLOOK_PROPIETARIO = ["jlmgarcia@jccm.es", "pepeluso@gmail.com"] as const;

export function puedeUsarOutlookCompartido(correo: string | null | undefined): boolean {
  const c = (correo ?? "").trim().toLowerCase();
  return (CUENTAS_OUTLOOK_PROPIETARIO as readonly string[]).includes(c);
}
