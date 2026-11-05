-- Additive document archive. Existing lease, billing, and payment rows are not changed.
BEGIN;

CREATE TABLE IF NOT EXISTS public.issued_documents (
  document_id bigserial PRIMARY KEY,
  document_type text NOT NULL CHECK (document_type IN ('lease_agreement', 'billing_statement', 'payment_receipt')),
  source_id integer NOT NULL,
  reference_number text NOT NULL,
  snapshot jsonb NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_type, source_id)
);

COMMIT;
