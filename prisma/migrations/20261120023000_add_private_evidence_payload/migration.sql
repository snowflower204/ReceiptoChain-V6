-- Store small MVP evidence attachments inside Postgres so financial documents
-- are served only after application authorization. A private object store can
-- replace this payload later without changing the workflow tables.

ALTER TABLE "evidence_documents"
  ADD COLUMN "submitted_by_id" INTEGER,
  ADD COLUMN "file_data" BYTEA;

CREATE INDEX "evidence_documents_submitted_by_id_idx"
  ON "evidence_documents"("submitted_by_id");

ALTER TABLE "evidence_documents"
  ADD CONSTRAINT "evidence_documents_submitted_by_id_fkey"
  FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "evidence_documents"
  ADD CONSTRAINT "evidence_documents_file_size_check"
  CHECK ("file_data" IS NULL OR octet_length("file_data") <= 2097152);
