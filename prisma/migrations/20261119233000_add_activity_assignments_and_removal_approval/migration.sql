-- Activity-scoped team assignments and admin-approved finance removal.

CREATE TYPE "BusinessEventMemberRole" AS ENUM (
  'FINANCE_REVIEWER',
  'ORGANIZER',
  'STAFF',
  'VOLUNTEER',
  'VIEWER'
);

CREATE TYPE "RemovalRequestStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
);

ALTER TABLE "financial_activities"
  ADD COLUMN "voided_by_id" INTEGER,
  ADD COLUMN "voided_at" TIMESTAMP(3),
  ADD COLUMN "void_reason" TEXT,
  ADD COLUMN "restorable_until" TIMESTAMP(3);

CREATE TABLE "business_event_members" (
  "business_id" INTEGER NOT NULL,
  "event_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "assigned_by_id" INTEGER NOT NULL,
  "role" "BusinessEventMemberRole" NOT NULL DEFAULT 'STAFF',
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "business_event_members_pkey" PRIMARY KEY ("event_id", "user_id")
);

CREATE TABLE "financial_activity_removal_requests" (
  "id" SERIAL NOT NULL,
  "business_id" INTEGER NOT NULL,
  "activity_id" INTEGER NOT NULL,
  "requested_by_id" INTEGER NOT NULL,
  "reviewed_by_id" INTEGER,
  "reason" TEXT NOT NULL,
  "status" "RemovalRequestStatus" NOT NULL DEFAULT 'PENDING',
  "previous_status" "FinancialActivityStatus" NOT NULL,
  "review_notes" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "financial_activity_removal_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "business_event_members_business_id_role_idx"
  ON "business_event_members"("business_id", "role");

CREATE INDEX "business_event_members_user_id_role_idx"
  ON "business_event_members"("user_id", "role");

CREATE INDEX "financial_activity_removal_requests_business_id_status_created_at_idx"
  ON "financial_activity_removal_requests"("business_id", "status", "created_at");

CREATE INDEX "financial_activity_removal_requests_activity_id_status_idx"
  ON "financial_activity_removal_requests"("activity_id", "status");

CREATE UNIQUE INDEX "financial_activity_removal_requests_one_pending_per_activity"
  ON "financial_activity_removal_requests"("activity_id")
  WHERE "status" = 'PENDING';

CREATE INDEX "financial_activity_removal_requests_requested_by_id_idx"
  ON "financial_activity_removal_requests"("requested_by_id");

ALTER TABLE "business_event_members"
  ADD CONSTRAINT "business_event_members_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "business_event_members"
  ADD CONSTRAINT "business_event_members_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "business_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "business_event_members"
  ADD CONSTRAINT "business_event_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "business_event_members"
  ADD CONSTRAINT "business_event_members_assigned_by_id_fkey"
  FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "financial_activities"
  ADD CONSTRAINT "financial_activities_voided_by_id_fkey"
  FOREIGN KEY ("voided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_activity_removal_requests"
  ADD CONSTRAINT "financial_activity_removal_requests_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "financial_activity_removal_requests"
  ADD CONSTRAINT "financial_activity_removal_requests_activity_id_fkey"
  FOREIGN KEY ("activity_id") REFERENCES "financial_activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "financial_activity_removal_requests"
  ADD CONSTRAINT "financial_activity_removal_requests_requested_by_id_fkey"
  FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "financial_activity_removal_requests"
  ADD CONSTRAINT "financial_activity_removal_requests_reviewed_by_id_fkey"
  FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION validate_business_event_member_tenant()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "business_events" event
    WHERE event."id" = NEW."event_id"
      AND event."business_id" = NEW."business_id"
  ) THEN
    RAISE EXCEPTION 'Event assignment must belong to the same business';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "business_members" member
    WHERE member."business_id" = NEW."business_id"
      AND member."user_id" = NEW."user_id"
  ) THEN
    RAISE EXCEPTION 'Assigned user must be a member of the business';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "business_event_members_tenant_guard"
BEFORE INSERT OR UPDATE ON "business_event_members"
FOR EACH ROW EXECUTE FUNCTION validate_business_event_member_tenant();

CREATE OR REPLACE FUNCTION validate_activity_removal_tenant()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "financial_activities" activity
    WHERE activity."id" = NEW."activity_id"
      AND activity."business_id" = NEW."business_id"
  ) THEN
    RAISE EXCEPTION 'Removal request must belong to the same business as its financial activity';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "business_members" member
    WHERE member."business_id" = NEW."business_id"
      AND member."user_id" = NEW."requested_by_id"
  ) THEN
    RAISE EXCEPTION 'Removal requester must be a member of the business';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "financial_activity_removals_tenant_guard"
BEFORE INSERT OR UPDATE ON "financial_activity_removal_requests"
FOR EACH ROW EXECUTE FUNCTION validate_activity_removal_tenant();
