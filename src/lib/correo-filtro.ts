import { z } from "zod";
export const CORREO_INICIAL = "jlmgarcia@jccm.es";
/** Solo correos del remitente configurado cuyo asunto contenga NOTA INTERIOR o ENTRADA. */
export const busquedaCorreo = (email: string) =>
  `from:${z.string().email().parse(email.trim().toLowerCase())} (subject:"nota interior" OR subject:entrada) newer_than:30d -in:chats -in:trash -in:spam`;
