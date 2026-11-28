ALTER TABLE "event_budget_items" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "event_budget_items" ADD CONSTRAINT "event_budget_items_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "evidence_documents" ADD COLUMN "receipt_reference" TEXT;
