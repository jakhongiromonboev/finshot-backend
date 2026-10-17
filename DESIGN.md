# Design

## Q1. Tables, indexes, and constraints

`customers` contains the three supplied customers. `transfers` stores each transfer's request, calculated amounts, status, and creation time. One customer can have many transfers.

Primary keys prevent duplicate identifiers. The application generates transfer IDs with `randomUUID()`. The foreign key prevents transfers for missing customers; `ON DELETE RESTRICT` prevents deleting a customer with transfers. Foreign key enforcement is enabled when opening SQLite.

`UNIQUE(idempotency_key)` prevents duplicate transfers for one key and provides an index for retry lookups. Primary keys also provide indexed lookups. The additional `customer_id` index supports customer searches and foreign key checks.

`NOT NULL` rejects missing required values. `CHECK` constraints restrict currencies, recipient names, and status values. Request validation checks monetary values and names before insertion. Cancellation uses a conditional update requiring `REQUESTED`, preventing invalid transitions.

## Q2. Idempotency and simultaneous requests

The client supplies a nonblank `Idempotency-Key` header and reuses it when retrying one intended transfer. Keys are unique across all customers. A missing or blank key returns 400.

The service looks up the key and compares customer ID, currencies, normalized amount, and recipient name. Leading zeros in amounts are removed during validation. Matching requests return the existing transfer; different data returns 409.

The application performs these comparisons, while the database guarantees key uniqueness. In this single Node process, synchronous service methods and `DatabaseSync` run without yielding, so simultaneous create requests execute sequentially.

The insert also uses `ON CONFLICT (idempotency_key) DO NOTHING`. If another writer already inserted the key, the service reads that row and compares its request instead of creating a second transfer. There is no distributed coordination or database-lock retry mechanism.

## Q3. Exact money and rounding

The API accepts and returns money as decimal strings. SQLite stores these strings as `TEXT`, avoiding floating-point conversion. Calculations use `BigInt`: whole won for KRW and whole centavos for PHP.

The percentage fee is `sendAmount / 100`, rounded HALF_UP to whole won, then raised to 3,000 won if smaller. `totalDebit` adds the final fee to the send amount without further rounding.

The exchange rate is represented exactly: multiplying won by `412 / 100` gives centavos. This conversion is rounded HALF_UP to whole centavos. The result is formatted as pesos with exactly two decimal places, including trailing zeros.

For positive values, HALF_UP increases the integer quotient when twice the remainder is at least the divisor. Rounding happens only at the fee and conversion boundaries, where the required currency precision is known.
