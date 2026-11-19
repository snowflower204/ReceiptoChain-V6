BEGIN;

-- Add the separate liquidation lifecycle.
CREATE TYPE "LiquidationReportStatus" AS ENUM ('DRAFT', 'FINALIZED', 'VOIDED');

CREATE TABLE "liquidation_reports" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "finalized_by_id" INTEGER,
    "report_number" TEXT NOT NULL,
    "status" "LiquidationReportStatus" NOT NULL DEFAULT 'DRAFT',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "finalized_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "liquidation_reports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "liquidation_reports_period_check" CHECK ("period_end" >= "period_start")
);

CREATE TABLE "liquidation_items" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "report_id" INTEGER NOT NULL,
    "activity_id" INTEGER NOT NULL,
    "included_by_id" INTEGER NOT NULL,
    "included_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "liquidation_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "liquidation_reports_business_id_report_number_key"
    ON "liquidation_reports"("business_id", "report_number");
CREATE INDEX "liquidation_reports_business_id_event_id_idx"
    ON "liquidation_reports"("business_id", "event_id");
CREATE INDEX "liquidation_reports_business_id_status_idx"
    ON "liquidation_reports"("business_id", "status");

-- An activity can be included in liquidation only once.
CREATE UNIQUE INDEX "liquidation_items_activity_id_key"
    ON "liquidation_items"("activity_id");
CREATE INDEX "liquidation_items_report_id_idx"
    ON "liquidation_items"("report_id");
CREATE INDEX "liquidation_items_business_id_included_at_idx"
    ON "liquidation_items"("business_id", "included_at");

ALTER TABLE "liquidation_reports"
    ADD CONSTRAINT "liquidation_reports_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "liquidation_reports"
    ADD CONSTRAINT "liquidation_reports_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "business_events"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "liquidation_reports"
    ADD CONSTRAINT "liquidation_reports_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "liquidation_reports"
    ADD CONSTRAINT "liquidation_reports_finalized_by_id_fkey"
    FOREIGN KEY ("finalized_by_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "liquidation_items"
    ADD CONSTRAINT "liquidation_items_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "liquidation_items"
    ADD CONSTRAINT "liquidation_items_report_id_fkey"
    FOREIGN KEY ("report_id") REFERENCES "liquidation_reports"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "liquidation_items"
    ADD CONSTRAINT "liquidation_items_activity_id_fkey"
    FOREIGN KEY ("activity_id") REFERENCES "financial_activities"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "liquidation_items"
    ADD CONSTRAINT "liquidation_items_included_by_id_fkey"
    FOREIGN KEY ("included_by_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Verify existing rows before enabling stricter tenant checks.
DO $validation$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "event_budget_items" bi
        JOIN "business_events" e ON e."id" = bi."event_id"
        WHERE bi."business_id" <> e."business_id"
    ) THEN
        RAISE EXCEPTION 'Existing event budget item crosses business boundaries';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "financial_activities" a
        JOIN "business_events" e ON e."id" = a."event_id"
        LEFT JOIN "event_budget_items" bi ON bi."id" = a."budget_item_id"
        WHERE a."business_id" <> e."business_id"
           OR (a."budget_item_id" IS NOT NULL AND
               (bi."business_id" <> a."business_id" OR bi."event_id" <> a."event_id"))
    ) THEN
        RAISE EXCEPTION 'Existing financial activity crosses tenant or event boundaries';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "evidence_documents" d
        LEFT JOIN "financial_activities" a ON a."id" = d."activity_id"
        LEFT JOIN "reimbursement_requests" r ON r."id" = d."reimbursement_id"
        WHERE (d."activity_id" IS NULL) = (d."reimbursement_id" IS NULL)
           OR (d."activity_id" IS NOT NULL AND a."business_id" <> d."business_id")
           OR (d."reimbursement_id" IS NOT NULL AND r."business_id" <> d."business_id")
    ) THEN
        RAISE EXCEPTION 'Existing evidence document has an invalid or cross-tenant parent';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "payment_confirmations" p
        JOIN "financial_activities" a ON a."id" = p."activity_id"
        WHERE p."business_id" <> a."business_id"
    ) THEN
        RAISE EXCEPTION 'Existing payment confirmation crosses business boundaries';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "reimbursement_requests" r
        JOIN "business_events" e ON e."id" = r."event_id"
        LEFT JOIN "financial_activities" a ON a."id" = r."settlement_activity_id"
        WHERE r."business_id" <> e."business_id"
           OR (r."settlement_activity_id" IS NOT NULL AND
               (a."business_id" <> r."business_id" OR
                a."event_id" <> r."event_id" OR
                a."type" <> 'REIMBURSEMENT'))
    ) THEN
        RAISE EXCEPTION 'Existing reimbursement crosses tenant or event boundaries';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "receipts" r
        JOIN "business_events" e ON e."id" = r."event_id"
        JOIN "financial_activities" a ON a."id" = r."activity_id"
        WHERE r."business_id" <> e."business_id"
           OR a."business_id" <> r."business_id"
           OR a."event_id" <> r."event_id"
    ) THEN
        RAISE EXCEPTION 'Existing receipt crosses tenant or event boundaries';
    END IF;
END
$validation$;

-- Evidence must belong to exactly one workflow.
ALTER TABLE "evidence_documents"
    ADD CONSTRAINT "evidence_documents_exactly_one_parent_check"
    CHECK (
        ("activity_id" IS NOT NULL AND "reimbursement_id" IS NULL)
        OR
        ("activity_id" IS NULL AND "reimbursement_id" IS NOT NULL)
    );

-- Preserve audit history even when a business is archived.
ALTER TABLE "audit_entries"
    DROP CONSTRAINT "audit_entries_business_id_fkey";
ALTER TABLE "audit_entries"
    ADD CONSTRAINT "audit_entries_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Make audit entries append-only at the database layer.
CREATE FUNCTION "prevent_audit_entry_mutation"()
RETURNS TRIGGER AS $audit$
BEGIN
    RAISE EXCEPTION 'audit_entries are append-only'
        USING ERRCODE = '55000';
END
$audit$ LANGUAGE plpgsql;

CREATE TRIGGER "audit_entries_append_only"
BEFORE UPDATE OR DELETE ON "audit_entries"
FOR EACH ROW EXECUTE FUNCTION "prevent_audit_entry_mutation"();

-- Enforce tenant ownership for every duplicated business_id relationship.
CREATE FUNCTION "check_event_budget_item_tenant"()
RETURNS TRIGGER AS $body$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM "business_events" e
        WHERE e."id" = NEW."event_id"
          AND e."business_id" = NEW."business_id"
    ) THEN
        RAISE EXCEPTION 'Budget item event must belong to the same business'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END
$body$ LANGUAGE plpgsql;

CREATE TRIGGER "event_budget_items_tenant_guard"
BEFORE INSERT OR UPDATE ON "event_budget_items"
FOR EACH ROW EXECUTE FUNCTION "check_event_budget_item_tenant"();

CREATE FUNCTION "check_financial_activity_tenant"()
RETURNS TRIGGER AS $body$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM "business_events" e
        WHERE e."id" = NEW."event_id"
          AND e."business_id" = NEW."business_id"
    ) THEN
        RAISE EXCEPTION 'Financial activity event must belong to the same business'
            USING ERRCODE = '23514';
    END IF;

    IF NEW."budget_item_id" IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM "event_budget_items" bi
        WHERE bi."id" = NEW."budget_item_id"
          AND bi."business_id" = NEW."business_id"
          AND bi."event_id" = NEW."event_id"
    ) THEN
        RAISE EXCEPTION 'Financial activity budget item must belong to the same business and event'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END
$body$ LANGUAGE plpgsql;

CREATE TRIGGER "financial_activities_tenant_guard"
BEFORE INSERT OR UPDATE ON "financial_activities"
FOR EACH ROW EXECUTE FUNCTION "check_financial_activity_tenant"();

CREATE FUNCTION "check_evidence_document_tenant"()
RETURNS TRIGGER AS $body$
BEGIN
    IF NEW."activity_id" IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM "financial_activities" a
        WHERE a."id" = NEW."activity_id"
          AND a."business_id" = NEW."business_id"
    ) THEN
        RAISE EXCEPTION 'Evidence activity must belong to the same business'
            USING ERRCODE = '23514';
    END IF;

    IF NEW."reimbursement_id" IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM "reimbursement_requests" r
        WHERE r."id" = NEW."reimbursement_id"
          AND r."business_id" = NEW."business_id"
    ) THEN
        RAISE EXCEPTION 'Evidence reimbursement must belong to the same business'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END
$body$ LANGUAGE plpgsql;

CREATE TRIGGER "evidence_documents_tenant_guard"
BEFORE INSERT OR UPDATE ON "evidence_documents"
FOR EACH ROW EXECUTE FUNCTION "check_evidence_document_tenant"();

CREATE FUNCTION "check_payment_confirmation_tenant"()
RETURNS TRIGGER AS $body$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM "financial_activities" a
        WHERE a."id" = NEW."activity_id"
          AND a."business_id" = NEW."business_id"
    ) THEN
        RAISE EXCEPTION 'Payment confirmation activity must belong to the same business'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END
$body$ LANGUAGE plpgsql;

CREATE TRIGGER "payment_confirmations_tenant_guard"
BEFORE INSERT OR UPDATE ON "payment_confirmations"
FOR EACH ROW EXECUTE FUNCTION "check_payment_confirmation_tenant"();

CREATE FUNCTION "check_reimbursement_tenant"()
RETURNS TRIGGER AS $body$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM "business_events" e
        WHERE e."id" = NEW."event_id"
          AND e."business_id" = NEW."business_id"
    ) THEN
        RAISE EXCEPTION 'Reimbursement event must belong to the same business'
            USING ERRCODE = '23514';
    END IF;

    IF NEW."settlement_activity_id" IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM "financial_activities" a
        WHERE a."id" = NEW."settlement_activity_id"
          AND a."business_id" = NEW."business_id"
          AND a."event_id" = NEW."event_id"
          AND a."type" = 'REIMBURSEMENT'
    ) THEN
        RAISE EXCEPTION 'Reimbursement settlement must be a reimbursement activity in the same business and event'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END
$body$ LANGUAGE plpgsql;

CREATE TRIGGER "reimbursement_requests_tenant_guard"
BEFORE INSERT OR UPDATE ON "reimbursement_requests"
FOR EACH ROW EXECUTE FUNCTION "check_reimbursement_tenant"();

CREATE FUNCTION "check_receipt_tenant"()
RETURNS TRIGGER AS $body$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM "business_events" e
        JOIN "financial_activities" a
          ON a."event_id" = e."id"
        WHERE e."id" = NEW."event_id"
          AND e."business_id" = NEW."business_id"
          AND a."id" = NEW."activity_id"
          AND a."business_id" = NEW."business_id"
    ) THEN
        RAISE EXCEPTION 'Receipt event and activity must belong to the same business'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END
$body$ LANGUAGE plpgsql;

CREATE TRIGGER "receipts_tenant_guard"
BEFORE INSERT OR UPDATE ON "receipts"
FOR EACH ROW EXECUTE FUNCTION "check_receipt_tenant"();

CREATE FUNCTION "check_liquidation_report_tenant"()
RETURNS TRIGGER AS $body$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM "business_events" e
        WHERE e."id" = NEW."event_id"
          AND e."business_id" = NEW."business_id"
    ) THEN
        RAISE EXCEPTION 'Liquidation report event must belong to the same business'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END
$body$ LANGUAGE plpgsql;

CREATE TRIGGER "liquidation_reports_tenant_guard"
BEFORE INSERT OR UPDATE ON "liquidation_reports"
FOR EACH ROW EXECUTE FUNCTION "check_liquidation_report_tenant"();

CREATE FUNCTION "check_liquidation_item_tenant"()
RETURNS TRIGGER AS $body$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM "liquidation_reports" r
        JOIN "financial_activities" a
          ON a."event_id" = r."event_id"
        WHERE r."id" = NEW."report_id"
          AND r."business_id" = NEW."business_id"
          AND r."status" = 'DRAFT'
          AND a."id" = NEW."activity_id"
          AND a."business_id" = NEW."business_id"
          AND a."status" = 'RECONCILED'
    ) THEN
        RAISE EXCEPTION 'Only a reconciled activity from the same business and event can enter a draft liquidation report'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END
$body$ LANGUAGE plpgsql;

CREATE TRIGGER "liquidation_items_tenant_guard"
BEFORE INSERT OR UPDATE ON "liquidation_items"
FOR EACH ROW EXECUTE FUNCTION "check_liquidation_item_tenant"();

COMMIT;
