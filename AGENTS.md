# Pet CRM agent guide

- Start backend and database work before frontend work.
- Preserve domain rules in PostgreSQL-backed settings; never hardcode booking hours or cutoffs in clients.
- Treat AI as an intent/explanation layer. Availability, price, identity, authorization, and booking transitions are deterministic server responsibilities.
- Use the project skills in `.agents/skills/nestjs-patterns` and `.agents/skills/design-system` when relevant.
- Use Graphify for architecture exploration after `graphify-out/` has been generated.
- Before handoff run: `npm run typecheck` + `npm run build` in `client/`, and `npm test` + `npm run build` in `server/` (npm workspaces; no pnpm).
- Never log secrets, refresh tokens, verification tokens, LINE raw payloads, or owner contact details.

<!-- BEGIN:nextjs-agent-rules -->
# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant documentation in `client/node_modules/next/dist/docs/`. Installed, version-matched docs are the source of truth.
<!-- END:nextjs-agent-rules -->
