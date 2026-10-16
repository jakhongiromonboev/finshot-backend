# Finshot backend assignment

The NestJS module structure and SQLite tables for customers and transfers are in place. Transfer endpoints and business rules are not implemented yet.

## Run

Use Node.js 22.22.3 (the tested version) or a newer supported version. The npm scripts use a macOS/Linux shell. From this directory, install dependencies:

```sh
npm ci
```

Create a local `.env` file next to `package.json`:

```dotenv
PORT=3000
DATABASE_PATH=:memory:
```

For development, use `npm run start:dev`. The local Nest CLI loads `.env`, watches source files, recompiles changes, and restarts the server. Alternatively, `npm start` builds once and starts the compiled application with `.env`. Both commands set `NODE_ENV=development`.

The server listens at `http://127.0.0.1:3000`. Set `PORT` to use another port. There are no registered routes in this first step, so requests currently receive Nest's default 404 response. The assignment's error format will be added with the API.

### Production deployment configuration

For deployment, create a local `.env.production` file next to `package.json`:

```dotenv
PORT=3000
DATABASE_PATH=./finshot-backend
```

Then build and run:

```sh
npm run build
npm run start:prod
```

`start:prod` sets `NODE_ENV=production` and uses Node's `--env-file=.env.production` flag to load the file before the application starts. The file is required; an existing shell environment variable takes precedence over a value in the file. `start:prod` runs the existing build, so rebuild after changing TypeScript code.

Development reads `.env`; production reads `.env.production`. Actual `.env` files are ignored by Git, so create them using the values documented above on a fresh checkout. Neither command automatically loads the other environment's file.

## Stack

- NestJS and TypeScript, with Fastify as Nest's HTTP adapter.
- SQLite through Node.js's built-in `node:sqlite` module.
- Direct SQL, without an ORM or a separate database server.

Node.js 22 labels `node:sqlite` experimental and prints a warning. The module's synchronous operations are suitable for this small assignment; they block the JavaScript thread while a query runs.

## Database

`DatabaseService` reads `DATABASE_PATH`, defaulting to `:memory:`, and owns one SQLite connection. Its `onModuleInit()` hook opens the database and executes the root `schema.sql` during Nest initialization. Its `onModuleDestroy()` hook closes the connection on application shutdown. Foreign-key enforcement is explicitly enabled.

Development uses `:memory:`: each application start creates a fresh database with the supplied customers: `C001/Kim`, `C002/Lee`, and `C003/Park`. Development data does not survive a restart. `NODE_ENV=production` alone does not select a different database; the loaded `DATABASE_PATH` selects it. The schema path is resolved relative to the application file, so it also works when the compiled application is launched from another working directory.

Production uses `./finshot-backend`, a SQLite database **file**, not a directory. A `.db` extension is optional. Relative database paths are resolved from the process working directory; npm scripts run from this project directory. SQLite creates the file on first use and opens the same file on later starts. The database and its journal/WAL files are ignored by Git. During future deployment, retain the database file on persistent storage across application releases; an absolute `DATABASE_PATH` can identify that location.

Startup executes `schema.sql` inside a transaction. `CREATE TABLE IF NOT EXISTS` creates missing tables without replacing existing ones. Seed rows use `ON CONFLICT (customer_id) DO NOTHING`, so existing customer rows and names are preserved, and missing seed IDs are inserted. If initialization fails, closing the connection rolls back the uncommitted schema transaction.

This supports repeated initialization of the current schema, not automatic schema upgrades. Adding or changing columns in an existing table requires an explicit migration; editing a `CREATE TABLE IF NOT EXISTS` definition does not update an existing table.

Each transfer has its own `transfer_id` primary key and a required `customer_id` foreign key. A customer can have many transfers; a transfer must reference an existing customer. `ON DELETE RESTRICT` prevents deleting a customer while their transfers exist. The non-unique customer index supports lookups by customer and foreign-key checks when deleting a customer or changing their ID.

`idempotency_key` is globally unique across transfers. This is the database guard against duplicate creation; comparing a retry's request fields and returning the original response or a conflict still need application logic. The currency checks allow only KRW to PHP. The recipient check rejects empty names, names containing only ordinary spaces, and names over 100 characters; complete request validation, including other whitespace, will be implemented in the API. Status defaults to `REQUESTED` and is limited to the assignment's five states; valid state transitions still need application logic.

Money columns use `TEXT`: whole-won decimal strings for `send_amount`, `fee`, and `total_debit`, and a decimal string with two fractional digits for `receive_amount` in PHP. For example: `"500000"`, `"5000"`, `"505000"`, and `"20600.00"`. The planned application code will validate and normalize these strings, calculate using `BigInt` in whole won / PHP centavos, and bind strings directly to SQLite without passing through JavaScript `Number` or SQLite `REAL`. The schema currently requires these values but does not validate their numeric format or calculate them. `created_at` will be supplied by the application as a UTC ISO 8601 string. No sample transfers are seeded.

## Structure

```text
src/
  main.ts
  app.module.ts
  components/
    components.module.ts
    transfers/
      transfers.module.ts
    database/
      database.module.ts
      database.service.ts
  libs/
    dto/
      transfers/
        creating/
    utils/
    filters/
```

`AppModule` imports `ComponentsModule`, which imports the feature modules. `TransfersModule` imports `DatabaseModule`; that module exports `DatabaseService` so the transfer feature can use it. DTOs, utilities, controllers, services, and repositories will be added as their behavior is implemented.

## Checks

```sh
npm run build
```

## AI tools

OpenAI Codex helped discuss the assignment and translate its requirements.
OpenAI Codex generated and explained the NestJS setup and SQLite customer/transfer schema.
OpenAI Codex assisted with local build, database, and startup verification.

## Not implemented yet

Part 1 still needs transfer persistence, request validation, exact money calculations, idempotency, create/read/cancel endpoints, the required error format, S1-S6 evidence, and design answers. Part 2 is not implemented.
