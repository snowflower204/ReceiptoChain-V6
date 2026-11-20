-- The MVP confirms each complete money movement once. Stop the migration with
-- a clear message instead of silently discarding any unexpected duplicates.

DO $$
BEGIN
  IF EXISTS (
    SELECT "activity_id"
    FROM "payment_confirmations"
    GROUP BY "activity_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate payment confirmations must be resolved before applying this migration';
  END IF;
END;
$$;

CREATE UNIQUE INDEX "payment_confirmations_activity_id_key"
  ON "payment_confirmations"("activity_id");
