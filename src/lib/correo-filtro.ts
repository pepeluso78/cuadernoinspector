import { z } from "zod";
export const CORREO_INICIAL = "jlmgarcia@jccm.es";
const ASUNTOS = `(subject:"nota interior" OR subject:entrada) newer_than:30d -in:chats -in:trash -in:spam`;
/** Correos cuyo asunto empiece por NOTA INTERIOR o ENTRADA (seguido de número o texto).
 *  Si el remitente configurado es la propia cuenta Gmail, no se filtra por remitente. */
export const busquedaCorreo = (email: string, cuentaGmail?: string) => {
  const e = z.string().email().parse(email.trim().toLowerCase());
  return cuentaGmail && cuentaGmail.toLowerCase() === e ? ASUNTOS : `from:${e} ${ASUNTOS}`;
};
export const asuntoValido = (asunto: string) => /^\s*((rv|re|fw|fwd)\s*:\s*)*(nota\s+interior|entrada)\b/i.test(asunto);
