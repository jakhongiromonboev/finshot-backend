BEGIN;

CREATE TABLE IF NOT EXISTS customers (
  customer_id VARCHAR(10) PRIMARY KEY,
  name        VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS transfers (
  transfer_id     TEXT PRIMARY KEY NOT NULL,
  customer_id     VARCHAR(10) NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  send_currency  TEXT NOT NULL CHECK (send_currency = 'KRW'),
  send_amount    TEXT NOT NULL,
  receive_currency TEXT NOT NULL CHECK (receive_currency = 'PHP'),
  receive_amount TEXT NOT NULL,
  fee            TEXT NOT NULL,
  total_debit    TEXT NOT NULL,
  recipient_name TEXT NOT NULL
    CHECK (length(trim(recipient_name)) > 0 AND length(recipient_name) <= 100),
  status         TEXT NOT NULL DEFAULT 'REQUESTED'
    CHECK (status IN ('REQUESTED', 'SENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  created_at     TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_transfers_customer_id ON transfers(customer_id);

INSERT INTO customers (customer_id, name) VALUES
  ('C001', 'Kim'), ('C002', 'Lee'), ('C003', 'Park')
ON CONFLICT (customer_id) DO NOTHING;

COMMIT;
