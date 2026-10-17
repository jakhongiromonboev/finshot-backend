# Part 1 API results

Captured on 2026-10-17T04:32:01.925Z using Node v22.22.3 and a fresh in-memory SQLite database. S1-S6 ran in order over real HTTP on port 3100. The application used the same module, prefix, validation pipe, and exception filter as main.ts. Requests below include every header sent. IDs and timestamps are actual captured values.

To reproduce from a fresh project, run:

```sh
npm ci && PORT=3100 DATABASE_PATH=:memory: npm start
```

Send the requests below in order. Replace the captured ID in the S4 cancellation and S5 URLs with the ID returned by your S4 create request. A new run generates different UUIDs and timestamps.

| Scenario | Actual HTTP status | Outcome |
| --- | --- | --- |
| S1 | 201 | Created REQUESTED transfer |
| S2 | 201 | Same response and transfer ID; no extra row |
| S3 | 409 | Same key with changed amount rejected |
| S4 create / cancel | 201 / 200 | Second transfer created and cancelled |
| S5 | 409 | Second cancellation rejected |
| S6 | 400 | Amount below 10,000 rejected |

## S1

Request:

```http
POST /api/transfers HTTP/1.1
Host: 127.0.0.1:3100
Connection: close
Content-Type: application/json
Content-Length: 121
Idempotency-Key: finshot-s1

{"customerId":"C001","sendCurrency":"KRW","sendAmount":"500000","receiveCurrency":"PHP","recipientName":"Juan Dela Cruz"}
```

Status: **201**

Response:

```json
{
  "transferId": "a4f66bbf-0258-4745-847b-4670db4cf65e",
  "customerId": "C001",
  "idempotencyKey": "finshot-s1",
  "sendCurrency": "KRW",
  "sendAmount": "500000",
  "receiveCurrency": "PHP",
  "receiveAmount": "20600.00",
  "fee": "5000",
  "totalDebit": "505000",
  "recipientName": "Juan Dela Cruz",
  "createdAt": "2026-10-17T04:32:01.887Z",
  "status": "REQUESTED"
}
```

## S2

Request:

```http
POST /api/transfers HTTP/1.1
Host: 127.0.0.1:3100
Connection: close
Content-Type: application/json
Content-Length: 121
Idempotency-Key: finshot-s1

{"customerId":"C001","sendCurrency":"KRW","sendAmount":"500000","receiveCurrency":"PHP","recipientName":"Juan Dela Cruz"}
```

Status: **201**

Response:

```json
{
  "transferId": "a4f66bbf-0258-4745-847b-4670db4cf65e",
  "customerId": "C001",
  "idempotencyKey": "finshot-s1",
  "sendCurrency": "KRW",
  "sendAmount": "500000",
  "receiveCurrency": "PHP",
  "receiveAmount": "20600.00",
  "fee": "5000",
  "totalDebit": "505000",
  "recipientName": "Juan Dela Cruz",
  "status": "REQUESTED",
  "createdAt": "2026-10-17T04:32:01.887Z"
}
```

## S3

Request:

```http
POST /api/transfers HTTP/1.1
Host: 127.0.0.1:3100
Connection: close
Content-Type: application/json
Content-Length: 121
Idempotency-Key: finshot-s1

{"customerId":"C001","sendCurrency":"KRW","sendAmount":"600000","receiveCurrency":"PHP","recipientName":"Juan Dela Cruz"}
```

Status: **409**

Response:

```json
{
  "error": "CONFLICT",
  "message": "Idempotency key has already been used with a different request"
}
```

## S4 - create

Request:

```http
POST /api/transfers HTTP/1.1
Host: 127.0.0.1:3100
Connection: close
Content-Type: application/json
Content-Length: 119
Idempotency-Key: finshot-s4

{"customerId":"C002","sendCurrency":"KRW","sendAmount":"100000","receiveCurrency":"PHP","recipientName":"Maria Santos"}
```

Status: **201**

Response:

```json
{
  "transferId": "d2337b09-6c3c-4d36-b550-796e8e330ed0",
  "customerId": "C002",
  "idempotencyKey": "finshot-s4",
  "sendCurrency": "KRW",
  "sendAmount": "100000",
  "receiveCurrency": "PHP",
  "receiveAmount": "4120.00",
  "fee": "3000",
  "totalDebit": "103000",
  "recipientName": "Maria Santos",
  "createdAt": "2026-10-17T04:32:01.898Z",
  "status": "REQUESTED"
}
```

## S4 - cancel

Request:

```http
POST /api/transfers/d2337b09-6c3c-4d36-b550-796e8e330ed0/cancel HTTP/1.1
Host: 127.0.0.1:3100
Connection: close
Content-Length: 0
```

Status: **200**

Response:

```json
{
  "transferId": "d2337b09-6c3c-4d36-b550-796e8e330ed0",
  "customerId": "C002",
  "idempotencyKey": "finshot-s4",
  "sendCurrency": "KRW",
  "sendAmount": "100000",
  "receiveCurrency": "PHP",
  "receiveAmount": "4120.00",
  "fee": "3000",
  "totalDebit": "103000",
  "recipientName": "Maria Santos",
  "status": "CANCELLED",
  "createdAt": "2026-10-17T04:32:01.898Z"
}
```

## S5

Request:

```http
POST /api/transfers/d2337b09-6c3c-4d36-b550-796e8e330ed0/cancel HTTP/1.1
Host: 127.0.0.1:3100
Connection: close
Content-Length: 0
```

Status: **409**

Response:

```json
{
  "error": "CONFLICT",
  "message": "Only REQUESTED transfers can be cancelled"
}
```

## S6

Request:

```http
POST /api/transfers HTTP/1.1
Host: 127.0.0.1:3100
Connection: close
Content-Type: application/json
Content-Length: 119
Idempotency-Key: finshot-s6

{"customerId":"C001","sendCurrency":"KRW","sendAmount":"5000","receiveCurrency":"PHP","recipientName":"Juan Dela Cruz"}
```

Status: **400**

Response:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "sendAmount must be at least 10000"
}
```

## Database checks immediately after S6

Read-only queries ran through the same SQLite connection before additional checks.

```sql
SELECT COUNT(*) AS total FROM transfers;
-- total: 2

SELECT COUNT(*) AS total FROM transfers WHERE idempotency_key = 'finshot-s1';
-- total: 1
```

Stored rows at that point:

```json
[
  {
    "transfer_id": "a4f66bbf-0258-4745-847b-4670db4cf65e",
    "idempotency_key": "finshot-s1",
    "status": "REQUESTED"
  },
  {
    "transfer_id": "d2337b09-6c3c-4d36-b550-796e8e330ed0",
    "idempotency_key": "finshot-s4",
    "status": "CANCELLED"
  }
]
```

## Additional checks

After capturing S1-S6, GET returned the stored transfer; missing transfers and unknown routes returned 404/NOT_FOUND; a missing key and invalid numeric text returned 400/VALIDATION_ERROR. Malformed Unicode names were rejected with 400. A valid emoji name was stored unchanged and its retry returned the same transfer. Six simultaneous HTTP creates using one new key produced six 201 responses with the same transfer ID and increased the row count by exactly one. No test files are included in this submission.
