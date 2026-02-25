# AGENTS.md

## Cursor Cloud specific instructions

### Overview
Verqo is a SaaS test automation platform with a **NestJS backend** (port 3000) and **Next.js frontend** (port 3001), backed by **PostgreSQL** via **Prisma ORM**. See `README.md` for full architecture and API docs.

### Services

| Service | Port | How to start |
|---------|------|--------------|
| PostgreSQL | 5432 | `sudo pg_ctlcluster 16 main start` |
| Backend (NestJS) | 3000 | `cd backend && npx nest start --watch --builder swc` |
| Frontend (Next.js) | 3001 | `cd frontend && npm run dev` |

### Important caveats

- **Backend must use SWC builder**: The codebase has pre-existing TypeScript errors that prevent `tsc` compilation. Use `npx nest start --watch --builder swc` instead of `npm run start:dev` (which uses `tsc`). SWC skips type checking and transpiles only.
- **Redis is optional**: The BullMQ test queue service logs `ECONNREFUSED` errors at startup if Redis is not running. These are non-blocking; the app functions normally without Redis (test execution queue features won't work).
- **GitHub OAuth env vars**: The backend Joi validation requires `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `GITHUB_CALLBACK_URL` at boot. Dummy values work for local dev (actual GitHub OAuth won't function).
- **Frontend build fails on lint errors**: `npm run build` in `frontend/` fails due to pre-existing ESLint errors (Next.js runs ESLint during build). The dev server (`npm run dev`) works fine.
- **No lockfiles**: The repo has no `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`. Dependency versions may drift on `npm install`.

### Database setup
After PostgreSQL is running, the backend needs:
1. `cd backend && npx prisma generate`
2. `cd backend && npx prisma db push`
3. `cd backend && npm run db:seed` (creates demo accounts: admin@verqo.com/admin123, dev@verqo.com/dev123, client@verqo.com/client123)

### Environment files
- `backend/.env` — see `backend/README.md` for required variables (DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRATION_TIME, JWT_REFRESH_EXPIRATION_TIME, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_CALLBACK_URL)
- `frontend/.env.local` — needs `NEXT_PUBLIC_API_URL` set to the backend URL (default backend port is 3000)

### Lint / Test / Build commands
See `backend/package.json` and `frontend/package.json` for all scripts. Key ones:
- Backend lint: `cd backend && npm run lint` (pre-existing errors, exit code 1)
- Backend tests: `cd backend && npm test` (3/4 suites pass; `auth.controller.spec.ts` has a pre-existing TS type error)
- Frontend lint: `cd frontend && npm run lint` (pre-existing warnings/errors, exit code 1)
