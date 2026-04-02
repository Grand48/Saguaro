# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Application: Saguaro (Crew Scheduling & Job Management)

Full-stack field operations management app. Workers can book/schedule jobs, assign crew members, manage job tasks, use internal group messaging per job, and share photos per job.

### Pages / Routes
- `/` — Dashboard: summary stats (active jobs, crew count, pending tasks, completed jobs), upcoming schedule, task completion chart
- `/jobs` — Jobs list with status badges and date ranges; "New Job" dialog
- `/jobs/:id` — Job detail with 8 tabs: Overview, Crew, Tasks, Equipment, Contacts, Chat, Photos, Forms
- `/crew` — Crew member cards with avatar/role/contact
- `/crew/:id` — Crew member detail
- `/locations` — Job site locations with address, contact, access notes, and linked jobs
- `/locations/:id` — Location detail page with full info and linked job list
- `/time-off` — Time-off requests: crew members submit requests (3 tabs: Request / My Requests / All Requests). Foreman can approve or deny from "All Requests" tab with optional admin notes.

### Sample Data Seeded
- 5 crew members: Marcus Johnson (Foreman), Darius Webb (Electrician), Tamara Reyes (Plumber), Ray Okafor (Laborer), Sandra Kim (Supervisor)
- 4 jobs: Riverside Office Renovation (in_progress, IDs assigned), Lakeview Residential Rewire (scheduled), Downtown Plaza Plumbing (scheduled), Cedar Creek Site Cleanup (completed)
- Tasks per job, crew assignments, and chat messages seeded via SQL

### Key Design Decisions
- Photos stored as base64 data URLs in the DB (20MB JSON body limit in Express)
- `jobId` injected from URL path param in backend, NOT from request body, for tasks/messages/photos
- `useAssignCrewToJob` replaces all crew — add/remove must send full updated list

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── crew-scheduler/     # React + Vite frontend (Saguaro app)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

### DB Schema Tables
- `crew_members` — id, name, role, phone, email, avatar_url, created_at
- `jobs` — id, title, location, scope, status (scheduled/in_progress/completed/cancelled), start_date, end_date, notes, created_at
- `job_crew` — id, job_id (FK→jobs), crew_id (FK→crew_members) — many-to-many crew assignment
- `tasks` — id, job_id (FK→jobs), title, description, status (pending/in_progress/completed), assigned_to_id (FK→crew_members), created_at
- `messages` — id, job_id (FK→jobs), sender_name, content, photo_url, created_at
- `photos` — id, job_id (FK→jobs), url (base64 data URL), caption, uploaded_by, created_at
- `equipment` — id, job_id (FK→jobs), name, quantity, notes, status (needed/reserved/on_site/returned), created_at
- `job_forms` — id, job_id (FK→jobs), form_type (job_completion|quality_control|custom|safe_work_permit), status (draft|signed), fields (JSON string), signature_name, signature_data, custom_form_name, custom_form_data, signed_at, created_at

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

## Company Lodging Feature

Tracks room bookings for company lodging rooms C1–C10.

- **Route**: `/lodging` — monthly calendar grid + booking list
- **DB table**: `lodging_bookings` — room, guest_name, check_in (YYYY-MM-DD), check_out (YYYY-MM-DD), notes
- **API**: `GET /api/lodging?month=YYYY-MM`, `POST /api/lodging`, `PUT /api/lodging/:id`, `DELETE /api/lodging/:id`
- **Calendar view**: Rooms as rows, days of month as columns; bookings render as colored spans with colSpan
- **Export**: "Export CSV" downloads a `.csv`; "Email Report" opens mailto with the report in the body
- **CSV columns**: Room, Guest Name, Check-In, Check-Out, Nights Stayed, Notes

## Company Vehicles Feature

Fleet management with maintenance tracking.

- **Route**: `/vehicles` — vehicle cards grid + selected vehicle maintenance detail panel
- **DB tables**: `vehicles` (vehicleNumber, make, model, year, licensePlate, assignedTo, notes), `vehicle_maintenance` (vehicleId, type, status, scheduledDate, completedDate, mileage, cost, performedBy, notes)
- **API**: Full CRUD at `/api/vehicles` and `/api/vehicles/:id/maintenance`; single-record at `/api/maintenance/:id`
- **Status types**: `needed` (red), `upcoming` (yellow), `completed` (green)
- **Export**: Download CSV (vehicles + all maintenance records) and Spreadsheet + Email (downloads CSV + opens mailto)
- **Card badges**: Each vehicle card shows live counts of needed/upcoming maintenance items
- **Summary cards**: Fleet-wide totals for upcoming and needed maintenance

## Pending: RevenueCat Subscription Integration

The user wants subscription-based pricing ($19.99/month, $149.99/year) for the Saguaro Mobile app.

**To implement:**
1. Connect the RevenueCat integration in Replit (connector ID: `connector:ccfg_revenuecat_01KED80FZSMH99H5FHQWSX7D4M`) — user needs to click Connect and authorize via OAuth
2. After connecting, run `addIntegration` then get the `revenueCatClient.ts` code snippet
3. Run the seed script at `lib/scripts/src/seedRevenueCat.ts` to create the RevenueCat project, products, entitlements, and offerings
4. Set env vars: `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY`, `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`, `REVENUECAT_PROJECT_ID`
5. Create `artifacts/saguaro-mobile/lib/revenuecat.tsx` with SubscriptionProvider + useSubscription hook
6. Add paywall screen at `artifacts/saguaro-mobile/app/paywall.tsx`
7. Wrap root layout in SubscriptionProvider and gate app features behind subscription check
