# Finshot backend assignment

Part 1: create, read, and cancel KRW-to-PHP transfers with exact money calculations and idempotent creation.

Author: Jakhongir. Actual time spent: 3 hours 20 minutes.

## Run

Prerequisites: Node.js **22.22.3** (the tested version), npm, and a macOS/Linux shell. The `.nvmrc` file pins the tested Node version; if you use nvm, run `nvm install` and `nvm use` before starting. Node 20 cannot run this project because it does not provide the built-in `node:sqlite` module used here.

From the extracted project directory, run this single command:

```sh
npm ci && npm start
```

Dependencies are installed from `package-lock.json`, TypeScript is compiled, and the API starts at `http://127.0.0.1:3000/api`. Internet access is needed for the initial npm install. No separate database server, database installation, or `.env` file is required. Node may print a warning that `.env` is absent; defaults are used. Node 22 also prints an experimental warning for `node:sqlite`.

By default, SQLite runs in memory and starts with `C001/Kim`, `C002/Lee`, and `C003/Park`. Transfers and idempotency keys are lost when the process restarts.

## Stack and structure

- NestJS with TypeScript and the Fastify HTTP adapter.
- SQLite through Node's built-in `DatabaseSync`, using parameterized SQL without an ORM.
- ESM and TypeScript `NodeNext`; local imports intentionally end in `.js` for the compiled output.

```text
src/
  main.ts                         global prefix, pipe, filter, startup
  app.module.ts
  components/
    components.module.ts
    database/                     connection lifecycle and SQL access
    transfers/                    controller, service, repository, module
  libs/
    dto/transfers/                request DTO and transfer types
    pipes/                        request validation and normalization
    filters/                      consistent HTTP error responses
    utils/                        amount parsing and exact money calculations
```

The controller handles HTTP input, the service applies transfer rules, and the repository executes SQL through `DatabaseService`. SQLite operations are synchronous and block the JavaScript thread while running. This small assignment targets one application process.

## API

| Method | Path | Result |
| --- | --- | --- |
| POST | `/api/transfers` | 201, created or previously stored transfer |
| GET | `/api/transfers/{transferId}` | 200, or 404 when absent |
| POST | `/api/transfers/{transferId}/cancel` | 200 with `CANCELLED`, 404 when absent, or 409 unless currently `REQUESTED` |

Create a transfer:

```sh
curl -i -X POST http://127.0.0.1:3000/api/transfers \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: example-transfer-001' \
  --data '{"customerId":"C001","sendCurrency":"KRW","sendAmount":"500000","receiveCurrency":"PHP","recipientName":"Juan Dela Cruz"}'
```

The result includes a generated UUID `transferId`, `status: "REQUESTED"`, `sendAmount: "500000"`, `fee: "5000"`, `totalDebit: "505000"`, `receiveAmount: "20600.00"`, and a UTC ISO `createdAt`. The stored customer, currencies, recipient name, and idempotency key are also returned. Use the returned `transferId` in the read and cancel URLs. Cancellation needs no request body or idempotency header; repeating cancellation returns 409.

## Safe retries

Every create request must include a nonblank **`Idempotency-Key`** header. The client should generate a new UUID once for each intended transfer, save it with the request, and reuse that same key and body after a timeout or connection failure. For manual checks, a fixed value such as `example-transfer-001` also works. Keys are globally unique across customers. The same key and the same five validated request fields return the stored transfer with HTTP 201 without adding a row. Reusing the key with different data returns 409; a missing or blank key returns 400. Amounts are normalized, so `"00010000"` and `"10000"` match. Customer IDs, currencies, and recipient names otherwise compare exactly; names are not trimmed. Extra body fields are ignored. A retry after cancellation returns the same transfer with its current `CANCELLED` status.

The database's unique key constraint prevents duplicate rows. The service handles an insert conflict by reading the existing row and checking its request. Cancellation uses one conditional SQL update that requires `REQUESTED`.

## Validation and money

- `sendAmount` must be a string of decimal digits representing at least 10,000 whole KRW. Numbers, signs, decimal points, whitespace, and exponent notation are rejected.
- Only `KRW` to `PHP` is accepted, and the customer must exist.
- `recipientName` must contain a non-whitespace character and be at most 100 Unicode code points. Null characters and malformed Unicode are rejected so SQLite preserves the validated value.
- Fee: 1%, rounded HALF_UP to whole won, with a minimum of 3,000 KRW.
- `totalDebit` is the send amount plus the final fee.
- `receiveAmount` uses the exact rate 0.0412 PHP per KRW and HALF_UP rounding to two decimal places.

Money stays in decimal strings in the API and SQLite `TEXT` columns. Calculations use `BigInt` in won and centavos, with no floating-point arithmetic. PHP output always has two decimal places.

## Errors and assumptions

All HTTP errors handled by the application use two fields:

```json
{"error":"VALIDATION_ERROR","message":"sendAmount must be at least 10000"}
```

Part 1 uses `VALIDATION_ERROR` (400), `NOT_FOUND` (404), and `CONFLICT` (409). Unknown routes also use this format. For framework errors outside those specified cases, the filter preserves HTTP status: oversized bodies (413) and unsupported content types (415) use `VALIDATION_ERROR`; other client errors use `HTTP_ERROR`. Server errors use `INTERNAL_SERVER_ERROR` and a generic message, with details logged server-side. These fallback codes are documented choices because the assignment does not define server-error codes.

## Configuration and development

`npm start` optionally loads `.env`. Defaults are `PORT=3000` and `DATABASE_PATH=:memory:`. Existing shell variables take precedence over the env file. To configure the app or use watch mode in a fresh checkout:

```sh
cp .env.example .env
npm run start:dev
```

Watch mode restarts the application after source changes, resetting an in-memory database. For optional file persistence:

```sh
cp .env.production.example .env.production
npm run build
npm run start:prod
```

This loads `.env.production` and uses `DATABASE_PATH=./finshot-backend`, a SQLite file, not a directory. `NODE_ENV` alone does not select a database. Relative database paths resolve from the process working directory. `start:prod` requires its env file and an existing build; rebuild after source changes.

Startup executes `schema.sql` transactionally with foreign keys enabled. Seed inserts preserve existing customers. `CREATE TABLE IF NOT EXISTS` initializes missing tables; it does not migrate existing schemas.

## Verification and scope

`RESULT.md` records actual S1-S6 HTTP requests and responses from a fresh application instance. `DESIGN.md` answers Q1-Q3. Run `npm run typecheck` or `npm run build` to check compilation. No automated test files are included in this submission; the assignment makes them optional.

Part 2 is not implemented: no partner client, sending worker, callbacks, retries, or daily limit. In Part 1, transfers remain `REQUESTED` until cancelled. The schema permits all five assignment statuses, while the API implements only creation and `REQUESTED` to `CANCELLED`.

## AI tools

- OpenAI Codex assisted with understanding requirements and explaining implementation choices.
- OpenAI Codex assisted with TypeScript/SQL implementation and README, DESIGN, and RESULT documentation.
- OpenAI Codex assisted with build checks, API verification, edge-case review, and submission packaging.
