# Finshot backend assignment

This is the first implementation step: the NestJS module structure and an initialized SQLite database. Transfer endpoints and business rules are not implemented yet.

## Run

Use Node.js 22.22.3 (the tested version) or a newer supported version. From this directory, run:

```sh
npm ci && npm start
```

For development, use `npm run start:dev`. The local Nest CLI watches source files, recompiles changes, and restarts the server.

The server listens at `http://127.0.0.1:3000`. Set `PORT` to use another port. There are no registered routes in this first step, so requests currently receive Nest's default 404 response. The assignment's error format will be added with the API.

## Stack

- NestJS and TypeScript, with Fastify as Nest's HTTP adapter.
- SQLite through Node.js's built-in `node:sqlite` module.
- Direct SQL, without an ORM or a separate database server.

Node.js 22 labels `node:sqlite` experimental and prints a warning. The module's synchronous operations are suitable for this small assignment; they block the JavaScript thread while a query runs.

## Database

`DatabaseService` owns one in-memory SQLite connection. It executes the root `schema.sql` when Nest creates the service, and closes the connection on application shutdown. Foreign-key enforcement is explicitly enabled.

Each application start creates a fresh database with the supplied customers: `C001/Kim`, `C002/Lee`, and `C003/Park`. Data does not survive a restart. The schema path is resolved relative to the application file, so it also works when the compiled application is launched from another working directory.

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
OpenAI Codex generated and explained the initial NestJS and SQLite setup.
OpenAI Codex assisted with local build, database, and startup verification.

## Not implemented yet

Part 1 still needs transfer persistence, request validation, exact money calculations, idempotency, create/read/cancel endpoints, the required error format, S1-S6 evidence, and design answers. Part 2 is not implemented.
