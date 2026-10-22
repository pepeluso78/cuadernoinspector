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
- All app data is read/written from the browser via the generated Supabase client with RLS limited to authenticated users; single-inspector app, so any signed-in account sees all rows.
- Trámite deadlines are computed client-side in src/lib/plazos.ts (tested); a DB trigger mirrors each trámite's fecha_limite into agenda_eventos so the calendar stays in sync.
- Protected pages live under src/routes/_authenticated/ which renders the sidebar shell (src/components/app-shell.tsx).
- Email intake: forwarded mails land in the linked Gmail connection; src/lib/correo.server.ts imports them as trámites (deduped by tramites.correo_id), run every 10 min by a managed cron route and by the 'Importar del correo' button.
