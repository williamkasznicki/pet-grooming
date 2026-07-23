# Pet CRM agent guide

- Start backend and database work before frontend work.
- Preserve domain rules in PostgreSQL-backed settings; never hardcode booking hours or cutoffs in clients.
- Treat AI as an intent/explanation layer. Availability, price, identity, authorization, and booking transitions are deterministic server responsibilities.
- Use the project skills in `.agents/skills/nestjs-patterns` and `.agents/skills/design-system` when relevant.
- Before handoff run: `npm run typecheck` + `npm run build` in `client/`, and `npm test` + `npm run build` in `server/` (separate npm installs per directory; no pnpm).
- Never log secrets, refresh tokens, verification tokens, LINE raw payloads, or owner contact details.
- Repo layout: `client/` (turborepo: `apps/web`, `packages/ui`) and `server/` (NestJS + Prisma) are separate installs; run npm inside each directory.
- Local database: `docker compose up -d` (PostgreSQL 17 on port 5433 on purpose; 5432 is taken by a local install).
- Deeper write ups live in `docs/`: DESIGN.md (locked v1 scope), RBAC.md, AUTH.md, API-CONVENTIONS.md.

## Context files

- [server/AGENTS.md](server/AGENTS.md) (NestJS API: module layering, RBAC, soft delete, Prisma conventions)
- [client/AGENTS.md](client/AGENTS.md) (Next.js web app: BFF proxy, hooks, design tokens)

<!-- BEGIN:nextjs-agent-rules -->
# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant documentation in `client/node_modules/next/dist/docs/`. Installed, version-matched docs are the source of truth.
<!-- END:nextjs-agent-rules -->
