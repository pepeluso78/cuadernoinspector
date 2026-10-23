import { z } from "zod";
export const CORREO_INICIAL = "jlmgarcia@jccm.es";
export const busquedaCorreo = (email: string) => `from:${z.string().email().parse(email.trim().toLowerCase())} newer_than:30d -in:sent -in:chats`;