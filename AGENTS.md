# AGENTS.md

## Cursor Cloud specific instructions

This repo is a single **Next.js 15 (App Router, Turbopack) + React 19 + TypeScript** application for the "LinuxPro" web hosting company (marketing site + `/client` customer portal + `/rockyelfadmin` admin panel). It is one deployable process; the API is implemented as Next.js Route Handlers under `app/api/*`. Package manager is **npm** (`package-lock.json`). Standard scripts live in `package.json` (`dev`, `build`, `start`, `lint`).

### Running / testing (dev)
- Dev server: `npm run dev` (Turbopack) on port **3000**. Health check: `GET /api/health` returns the active DB mode and user count.
- Lint: `npm run lint`. Build: `npm run build`; production start: `npm run start`.
- A dev `.env.local` (gitignored) is expected. Minimum useful vars: `NEXTAUTH_SECRET`, `NEXTAUTH_URL=http://localhost:3000`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Model additional vars on `scripts/vps.env.example`.

### Non-obvious gotchas
- **No external database is required in dev.** When MongoDB env is unset/unreachable and `NODE_ENV !== production`, the app auto-falls back to a local JSON file DB at `data/local-db.json` (gitignored) and auto-seeds default stock/tickets. `/api/health` reports `"database":"local-file"` in this mode. See `lib/mongodb.ts` / `lib/local-db.ts`. `USE_LOCAL_DB_FALLBACK=false` disables the fallback (required in production).
- **Do NOT run `npm run build` while `npm run dev` is running.** Both share the `.next/` directory, and a concurrent build corrupts the running dev server (ENOENT `.next/**/*-manifest.json` / `_buildManifest.js.tmp` errors). If this happens: stop dev, `rm -rf .next`, then restart `npm run dev`.
- Cashfree (payments), HostHeaven VPS API (provisioning/stock sync), and Google/GitHub/Azure OAuth are optional integrations, each gated by their own env vars. The app boots and email/password auth works without any of them.
- The admin panel at `/rockyelfadmin` uses a separate, hardcoded admin credential check in `lib/admin.ts` (client `sessionStorage`), independent of the NextAuth customer login used by `/client`.
