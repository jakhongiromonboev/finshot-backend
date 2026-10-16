BEGIN;

CREATE TABLE IF NOT EXISTS customers (
  customer_id VARCHAR(10) PRIMARY KEY,
  name        VARCHAR(100) NOT NULL
);

INSERT INTO customers (customer_id, name) VALUES
  ('C001', 'Kim'), ('C002', 'Lee'), ('C003', 'Park')
ON CONFLICT (customer_id) DO NOTHING;

COMMIT;
