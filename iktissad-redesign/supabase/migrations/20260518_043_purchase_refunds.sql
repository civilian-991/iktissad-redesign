-- Purchase refunds support
-- Adds columns required to issue and track refunds against article_purchases.
--
-- - order_id / transaction_id: opaque MPGS identifiers needed to call the
--   MPGS REFUND endpoint (POST /merchant/{id}/order/{orderId}/transaction/{txId}).
-- - refunded / refunded_at / refund_reason / refunded_amount: bookkeeping
--   fields populated by /api/admin/refunds when a refund succeeds.

ALTER TABLE article_purchases
  ADD COLUMN IF NOT EXISTS order_id         TEXT,
  ADD COLUMN IF NOT EXISTS transaction_id   TEXT,
  ADD COLUMN IF NOT EXISTS refunded         BOOLEAN       NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS refunded_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_reason    TEXT,
  ADD COLUMN IF NOT EXISTS refunded_amount  NUMERIC(10,2);

CREATE INDEX IF NOT EXISTS idx_article_purchases_order_id ON article_purchases(order_id);
CREATE INDEX IF NOT EXISTS idx_article_purchases_refunded ON article_purchases(refunded);
