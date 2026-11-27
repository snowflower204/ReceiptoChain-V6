ALTER TABLE "business_events"
  ADD COLUMN "customer_fee" DECIMAL(14,2),
  ADD COLUMN "customer_payment_instructions" TEXT,
  ADD COLUMN "customer_registration_closed_at" TIMESTAMP(3);

CREATE TABLE "customer_registrations" (
  "event_id" INTEGER NOT NULL REFERENCES "business_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "amount" DECIMAL(14,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "activity_id" INTEGER REFERENCES "financial_activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("event_id", "user_id")
);
CREATE UNIQUE INDEX "customer_registrations_activity_id_key" ON "customer_registrations"("activity_id");
CREATE INDEX "customer_registrations_user_id_idx" ON "customer_registrations"("user_id");
