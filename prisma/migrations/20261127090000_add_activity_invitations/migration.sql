CREATE TABLE "activity_invitations" (
  "id" SERIAL PRIMARY KEY,
  "event_id" INTEGER NOT NULL,
  "issued_by_id" INTEGER NOT NULL,
  "code_hash" TEXT NOT NULL,
  "redeemed_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "activity_invitations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "business_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "activity_invitations_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "activity_invitations_code_hash_key" ON "activity_invitations"("code_hash");
CREATE INDEX "activity_invitations_event_id_idx" ON "activity_invitations"("event_id");
