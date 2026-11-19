-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FinancialActivityType" AS ENUM ('INCOME', 'EXPENSE', 'REFUND', 'REIMBURSEMENT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "FinancialActivityStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CONFIRMED', 'RECONCILED', 'VOIDED');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('PAYMENT_EVIDENCE', 'INVOICE', 'OFFICIAL_RECEIPT', 'SALES_INVOICE', 'EXPENSE_RECEIPT', 'REIMBURSEMENT_EVIDENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReimbursementStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "business_members" DROP CONSTRAINT "business_members_business_id_fkey";

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_events" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "venue" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'PHP',
    "budget_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_budget_items" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "planned_amount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_budget_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_activities" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,
    "budget_item_id" INTEGER,
    "created_by_id" INTEGER NOT NULL,
    "confirmed_by_id" INTEGER,
    "reconciled_by_id" INTEGER,
    "type" "FinancialActivityType" NOT NULL,
    "status" "FinancialActivityStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'PHP',
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "payment_method" TEXT,
    "external_ref" TEXT,
    "counterparty" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "reconciled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_documents" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "activity_id" INTEGER,
    "reimbursement_id" INTEGER,
    "reviewed_by_id" INTEGER,
    "kind" "DocumentKind" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "file_name" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "review_notes" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_confirmations" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "activity_id" INTEGER NOT NULL,
    "confirmed_by_id" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "provider" TEXT,
    "reference" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reimbursement_requests" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,
    "requester_id" INTEGER NOT NULL,
    "reviewed_by_id" INTEGER,
    "settlement_activity_id" INTEGER,
    "status" "ReimbursementStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reimbursement_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,
    "activity_id" INTEGER NOT NULL,
    "issued_by_id" INTEGER NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "public_token" TEXT NOT NULL,
    "verification_hash" TEXT NOT NULL,
    "recipient_name" TEXT,
    "recipient_email" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_entries" (
    "id" BIGSERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "actor_id" INTEGER,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "summary" TEXT,
    "metadata" JSONB,
    "previous_hash" TEXT,
    "entry_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "business_events_business_id_status_idx" ON "business_events"("business_id", "status");

-- CreateIndex
CREATE INDEX "business_events_business_id_starts_at_idx" ON "business_events"("business_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "business_events_business_id_slug_key" ON "business_events"("business_id", "slug");

-- CreateIndex
CREATE INDEX "event_budget_items_business_id_event_id_idx" ON "event_budget_items"("business_id", "event_id");

-- CreateIndex
CREATE INDEX "financial_activities_business_id_event_id_idx" ON "financial_activities"("business_id", "event_id");

-- CreateIndex
CREATE INDEX "financial_activities_business_id_status_idx" ON "financial_activities"("business_id", "status");

-- CreateIndex
CREATE INDEX "financial_activities_business_id_occurred_at_idx" ON "financial_activities"("business_id", "occurred_at");

-- CreateIndex
CREATE INDEX "financial_activities_budget_item_id_idx" ON "financial_activities"("budget_item_id");

-- CreateIndex
CREATE INDEX "evidence_documents_business_id_status_idx" ON "evidence_documents"("business_id", "status");

-- CreateIndex
CREATE INDEX "evidence_documents_activity_id_idx" ON "evidence_documents"("activity_id");

-- CreateIndex
CREATE INDEX "evidence_documents_reimbursement_id_idx" ON "evidence_documents"("reimbursement_id");

-- CreateIndex
CREATE INDEX "evidence_documents_sha256_idx" ON "evidence_documents"("sha256");

-- CreateIndex
CREATE INDEX "payment_confirmations_business_id_activity_id_idx" ON "payment_confirmations"("business_id", "activity_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_confirmations_business_id_provider_reference_key" ON "payment_confirmations"("business_id", "provider", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "reimbursement_requests_settlement_activity_id_key" ON "reimbursement_requests"("settlement_activity_id");

-- CreateIndex
CREATE INDEX "reimbursement_requests_business_id_event_id_idx" ON "reimbursement_requests"("business_id", "event_id");

-- CreateIndex
CREATE INDEX "reimbursement_requests_business_id_status_idx" ON "reimbursement_requests"("business_id", "status");

-- CreateIndex
CREATE INDEX "reimbursement_requests_requester_id_idx" ON "reimbursement_requests"("requester_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_activity_id_key" ON "receipts"("activity_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_public_token_key" ON "receipts"("public_token");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_verification_hash_key" ON "receipts"("verification_hash");

-- CreateIndex
CREATE INDEX "receipts_business_id_event_id_idx" ON "receipts"("business_id", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_business_id_receipt_number_key" ON "receipts"("business_id", "receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "audit_entries_entry_hash_key" ON "audit_entries"("entry_hash");

-- CreateIndex
CREATE INDEX "audit_entries_business_id_created_at_idx" ON "audit_entries"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_entries_business_id_entity_type_entity_id_idx" ON "audit_entries"("business_id", "entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_events" ADD CONSTRAINT "business_events_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_events" ADD CONSTRAINT "business_events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_budget_items" ADD CONSTRAINT "event_budget_items_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_budget_items" ADD CONSTRAINT "event_budget_items_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "business_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_activities" ADD CONSTRAINT "financial_activities_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_activities" ADD CONSTRAINT "financial_activities_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "business_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_activities" ADD CONSTRAINT "financial_activities_budget_item_id_fkey" FOREIGN KEY ("budget_item_id") REFERENCES "event_budget_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_activities" ADD CONSTRAINT "financial_activities_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_activities" ADD CONSTRAINT "financial_activities_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_activities" ADD CONSTRAINT "financial_activities_reconciled_by_id_fkey" FOREIGN KEY ("reconciled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_documents" ADD CONSTRAINT "evidence_documents_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_documents" ADD CONSTRAINT "evidence_documents_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "financial_activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_documents" ADD CONSTRAINT "evidence_documents_reimbursement_id_fkey" FOREIGN KEY ("reimbursement_id") REFERENCES "reimbursement_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_documents" ADD CONSTRAINT "evidence_documents_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_confirmations" ADD CONSTRAINT "payment_confirmations_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_confirmations" ADD CONSTRAINT "payment_confirmations_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "financial_activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_confirmations" ADD CONSTRAINT "payment_confirmations_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "business_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_settlement_activity_id_fkey" FOREIGN KEY ("settlement_activity_id") REFERENCES "financial_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "business_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "financial_activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
