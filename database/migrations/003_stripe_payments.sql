ALTER TABLE orders
  MODIFY COLUMN status ENUM('PENDING', 'PAID', 'CANCELLED', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'PENDING';

ALTER TABLE orders
  ADD COLUMN stripe_intent_id VARCHAR(255) NULL AFTER payment_method,
  ADD UNIQUE KEY uq_orders_stripe_intent_id (stripe_intent_id);