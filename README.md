# Employee Management System

A full-stack HR system: an **administrator back office** (employees, departments, leave, attendance,
payroll, inventory, onboarding and offboarding documents, roles and permissions, audit log) and a separate
**employee portal** (profile, attendance, leave requests, borrowed equipment, job openings).

- **Server:** Node 22, Express 5, MongoDB (Mongoose), Socket.IO for live notifications
- **Client:** React 19 (Create React App), React Router 7, TanStack Query, Tailwind CSS + Flowbite
- **Tests:** 206 server tests (`node --test`) and 43 client tests (Jest), run by GitHub Actions on every push

## Offboarding and the rehire tag

Employees leave through the **Offboarding** page, in two steps:

1. **Start:** how they are leaving and their last working day. They stay active during the notice period,
   and their offboarding document checklist opens.
2. **Complete:** on or after the last working day. HR must tag them **rehireable** or **non-rehireable**
   (non-rehireable needs a reason), and nobody may still report to them. They become inactive and lose
   portal access. Documents can still be collected afterwards.

The page also shows clearance: required documents verified, equipment returned, direct reports moved and
leave decided. A rehireable employee can be rehired, which keeps the earlier offboarding as history. A
non-rehireable one cannot be rehired or deleted, and their government ID numbers cannot be used on another
record. The employee edit form can no longer switch an active employee to inactive.

The checklist lines are managed under **Document Requirements**. The server adds the standard onboarding or
offboarding lines on start-up when that checklist has none.

## Repository layout

```
.
├── client/            React single-page app
├── server/            Express API
├── docker-compose.yml API + client + MongoDB for local use
├── render.yaml        Render deployment blueprint
└── .github/workflows/ci.yml
```

## Running it

### With Docker

```powershell
docker compose up --build
```

The client is on <http://localhost:3000>, the API on <http://localhost:8080> (port 3002 inside the
container) and MongoDB on 27017. The compose file holds throwaway development secrets: do not reuse them.

### Without Docker

You need Node 22 and a MongoDB database (a local one, or a free Atlas cluster).

```powershell
cd server
copy .env.example .env      # then set MONGO_URI
npm ci
npm start                   # API on http://localhost:3002
```

```powershell
cd client
npm ci
$env:REACT_APP_API_URL = "http://localhost:3002"
npm start                   # app on http://localhost:3000
```

The client defaults to `http://localhost:8080` (the Docker port), so set `REACT_APP_API_URL` when you run
the API directly.

### Sample data

Run these from the `server` folder with `MONGO_URI` set. Each is safe to run again.

| Script | Creates |
| --- | --- |
| `node scripts/seed.js` | Development administrator accounts and their roles (see `src/domain/role/defaultAccounts.js`) |
| `node scripts/seedDepartments.js` | Departments |
| `node scripts/seedEmployees.js` | 100 sample employees across the departments (no portal passwords) |
| `node scripts/seedLeaves.js` | Leave types, balances and filed leave |
| `node scripts/seedPayroll.js` | An hourly rate and daily time records for one portal user, to fill the payroll periods |
| `node scripts/seedInventory.js` | 20 inventory items |

The seeded accounts have well-known passwords. Never seed a database that real people can reach.

## Configuration

All server settings are environment variables, read in `server/src/infrastructure/config/config.js`.
`server/.env.example` lists them. The important ones:

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string (required) |
| `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `EMPLOYEE_JWT_SECRET` | Token signing secrets, three different random values. There are no defaults: see below |
| `USERNAME`, `PASSWORD`, `FIRST_NAME`, `LAST_NAME`, `EMAIL` | First administrator, created with full access when the database has none |
| `CORS_ORIGINS` | Browser origins allowed to call the API (comma-separated; empty allows any) |
| `TRUST_PROXY` | Number of reverse proxies in front of the API (Render: 1) |
| `RATE_LIMIT_*`, `AUTH_RATE_LIMIT_*` | Per-IP limits: general API, and the stricter one for sign-in |
| `WORK_UTC_OFFSET_MINUTES` | The workplace clock for shifts and lateness (default 480, UTC+8) |

The client has one setting, `REACT_APP_API_URL`, which Create React App bakes in at build time.

A signing secret that is missing, publicly known or the same as another is replaced by a random one when
the server starts, with a warning. The server stays safe, but everyone is signed out at each restart. To
generate a value (run it once per secret):

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

On Windows the system already defines `USERNAME`, which takes priority over the one in `server/.env`.

## Access and passwords

- **Permissions are enforced on every administrator route.** Which permission each route needs is listed in
  one file, `server/src/presentation/http/middleware/permissionPolicy.js`. A route in a guarded group that
  has no rule there is refused. Employment types share the Departments permissions; offboarding, emergency
  contacts and job openings use the Employees ones; managing administrator accounts needs
  `role-assignments:create`.
- **A new administrator can do nothing** until given a role under **Role Assignments**. Changes to roles
  reach a signed-in administrator when the access token renews (up to 15 minutes), or at the next sign-in.
- **No anonymous registration.** Signed-in administrators add others on the **Administrators** page.
- **Somebody can always manage access.** If, at start-up, no active administrator can edit roles and assign
  them, the server gives the `Administrator` role, with every permission, to the configured first
  administrator (matched by email, then username) or else the oldest one, and logs who. To choose someone
  yourself, run this from `server` with `MONGO_URI` set: `node scripts/grantFullAccess.js <username>`.
- **Passwords** are 8 to 72 characters. Administrators change their own under **Change password** (which
  signs them out everywhere) and reset a colleague's on the Administrators page. Employees change theirs on
  their portal profile; an administrator resets it on the Edit Employee screen. A portal token already
  issued keeps working until it expires (8 hours by default).

## How the code is organised

Both halves follow the same layering, so the same idea is easy to find on each side. Code depends
inward: the outer layers know about the inner ones, never the reverse.

### Server (`server/src`)

```
domain/           Plain entities and rules: Employee, LeaveRequest, Item, pagination, errors. No Express, no Mongo.
application/      Use cases ("what the system does"). Talk to repositories and ports, never to Express or Mongoose.
  ports/          Interfaces for things the use cases need from outside: PasswordHasher, TokenService, NotificationPublisher.
  shared/         createCrudUseCases: list, page, get, add, update, remove, shared by simple entities.
infrastructure/   The real implementations.
  persistence/mongo/   Mongoose models and the Mongo*Repository classes.
  security/            Bcrypt password hashing and JWT tokens.
  realtime/            Socket.IO server and the notification publisher.
  config/              Environment variables.
presentation/http/ Express: app.js, routes/, middleware/, validation/.
container.js      Wires it together: builds each repository and use case and exports them.
```

How a request flows, for example `GET /inventory`:

1. `index.js` creates the app with `createApp(useCases)` and attaches Socket.IO to the same HTTP server.
2. `app.js` runs the middleware in order: CORS, rate limiting, JSON body parser, audit logging.
3. The route (`routes/inventoryRoutes.js`) runs `requireAuth`, which verifies the access token.
4. It calls a use case (`inventoryUseCases`), which validates input and calls the repository.
5. `MongoInventoryRepository` queries MongoDB through `ItemModel`.
6. Errors thrown anywhere (`NotFoundError`, `ValidationError`, `ForbiddenError`) reach `errorHandler`, which turns
   them into the right HTTP status.

Things worth knowing:

- **`createApp` owns no state.** Every use case is passed in, and optional ones switch whole route groups on
  or off. That is why the tests can build the app with in-memory fakes (`server/tests/fakes.js`) and
  need no database.
- **Two sign-in systems.** Administrators and employees have separate tokens, signed with separate secrets,
  so an employee token can never act as an administrator. Employee routes live under `/employee-portal`.
- **Roles and permissions.** A role grants permission strings such as `salary-rates:view`.
  The permission policy checks the `permissions` claim inside the access token, so no database lookup
  is needed per request. Access tokens last 15 minutes; refresh tokens rotate.
- **Audit log.** The audit middleware records who changed what.
- **Notifications.** When someone files leave, the manager is notified: the use case calls the
  `NotificationPublisher` port, and Socket.IO pushes it to the browser.
- **Health check.** `GET /health` always answers while the process is up and reports the database state,
  but never depends on it, so a slow database does not make Render restart a healthy server.

### Client (`client/src`)

```
domain/           Entities and validation rules shared by forms and tests.
application/      Use cases the UI calls (auth, employees, departments, leave).
infrastructure/   Everything that touches the outside: http/ (axios client, HttpRepository), repositories/,
                  realtime/ (Socket.IO), storage/ (tokens), export/ (CSV and PDF), config/.
hooks/            TanStack Query hooks (createCrudHooks, useEntities), server-side table state, notifications.
resources/        One config per list screen: its columns, hooks and extra row buttons.
components/       Shared UI: DataTable, PageLayout, charts, sidebar, forms.
pages/            Screens: dashboard, employee CRUD, payroll, roles, documents, and the employee portal.
context/          Sign-in state for administrators and employees.
container.js      Wires repositories to use cases.
```

The pattern that saves the most code is the **resource**. A file in `resources/` (for example `inventory.jsx`)
describes one entity: its columns, the hooks for load, create, update and delete, and any extra row
buttons. `resources/index.js` lists them all, and from that list:

- `App.js` builds the list, add and edit routes,
- the sidebar builds its links,
- `ResourceListPage` renders the table with Add, Edit and Delete,
- `DataTable` handles server-side search, sort and paging.

Adding a simple new screen is therefore a new resource file plus its server routes.

## Tests and CI

```powershell
cd server; npm test                              # node --test, in-memory fakes, no database needed
cd client; $env:CI = "true"; npm test -- --watchAll=false
```

`.github/workflows/ci.yml` runs two jobs on every push to `master` or `main` and every pull request:

1. **Server tests:** `npm ci` then `npm test` on Node 22.
2. **Client tests and build:** `npm ci`, the Jest tests, then a production build, so a change that breaks
   the build is caught before Render sees it.

## Deployment

`render.yaml` is a Render Blueprint: an Express web service (`ems-api`) and a static site (`ems-client`).
MongoDB is not hosted by Render. Create an Atlas cluster and give its connection string to Render as
`MONGO_URI`. Set `CORS_ORIGINS` to the client's public URL and `REACT_APP_API_URL` to the API's.
