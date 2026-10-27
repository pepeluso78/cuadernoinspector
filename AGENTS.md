<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Quick document submission updates only its status and identity keys; synchronize the open centre form without replacing unsaved observations.
- Trámite lists load the complete archive in ordered pages and use independent normalized searches for pending and closed records, so older records remain searchable beyond Data API row limits.
- Password recovery uses the public /reset-password route and Cloud Auth recovery sessions; never expose passwords or bypass email ownership verification.
- Application settings are per-user rows in configuracion_aplicacion keyed by user_id (RLS: auth.uid() = user_id); new users start with blank identity/correo_referencia and fill them in Configuración. Credentials stay in Auth, and new visits snapshot configured identity/role/province to preserve historical reports. Theme values map to semantic CSS tokens; email import reads the configured sender through its existing authorized client.
- Calendar and visit register share agenda_eventos rows (tipo_evento = Visita a Centro), including report fields, so both directions stay consistent without duplicate synchronization writes; PDF reports are generated client-side from the uploaded institutional logo.

- Trámite deadlines are computed client-side in src/lib/plazos.ts (tested); a DB trigger mirrors each trámite's fecha_limite into agenda_eventos so the calendar stays in sync.
- Protected pages live under src/routes/_authenticated/ which renders the sidebar shell (src/components/app-shell.tsx).
- Agenda screen and PDF share the pure date-range and entry selectors in agenda-export; calendar PDFs include guardias without duplicate writes, while pending exports exclude completed events and attended guardias, so printed and visible scopes stay consistent.
- Email intake: forwarded mails land in the linked Gmail connection (only mails from the inspector JCCM address are imported); src/lib/correo.server.ts imports them as trámites (deduped by tramites.correo_id), run every 10 min by a managed cron route and by the 'Importar del correo' button.
- Trámite documents use the private tramites-documentos Storage bucket and documentos_tramite metadata; Gmail part IDs deduplicate imports and failed attachments are retried on subsequent imports, so partial mail imports are recoverable. Manual imports use the authenticated user's client; only cron imports use the admin client after cron authentication. Downloads use authenticated Storage reads.
- Every work table (centros, trámites, documentos, agenda, notas, documentación, partes, guardias) has user_id default auth.uid() with own-row RLS, and trámite files are readable only by the trámite owner, so each inspector works in a closed space; only normativa_clm is shared. Cron email imports assign rows to the configured user explicitly because auth.uid() is null there.
- Password recovery first asks a public server function to generate the recovery link and send it through the linked Gmail to the owner-configured correo_recuperacion (set only while signed in); if none is set it falls back to the standard Auth recovery email, so ownership is still proven by an owner-chosen inbox.
