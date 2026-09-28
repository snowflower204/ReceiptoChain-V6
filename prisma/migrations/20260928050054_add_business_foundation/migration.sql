-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('USER', 'PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "BusinessMemberRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "platform_role" "PlatformRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "businesses" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legal_name" TEXT,
    "country_code" VARCHAR(2) NOT NULL DEFAULT 'PH',
    "default_currency" VARCHAR(3) NOT NULL DEFAULT 'PHP',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Manila',
    "registration_number" TEXT,
    "tax_id" TEXT,
    "status" "BusinessStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_members" (
    "user_id" INTEGER NOT NULL,
    "business_id" INTEGER NOT NULL,
    "role" "BusinessMemberRole" NOT NULL DEFAULT 'STAFF',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_members_pkey" PRIMARY KEY ("user_id","business_id")
);

-- CreateTable
CREATE TABLE "business_invitations" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "code_hash" TEXT NOT NULL,
    "role" "BusinessMemberRole" NOT NULL DEFAULT 'STAFF',
    "expires_at" TIMESTAMP(3),
    "max_uses" INTEGER NOT NULL DEFAULT 1,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "businesses_slug_key" ON "businesses"("slug");

-- CreateIndex
CREATE INDEX "businesses_status_idx" ON "businesses"("status");

-- CreateIndex
CREATE INDEX "businesses_country_code_idx" ON "businesses"("country_code");

-- CreateIndex
CREATE INDEX "business_members_business_id_idx" ON "business_members"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_invitations_code_hash_key" ON "business_invitations"("code_hash");

-- CreateIndex
CREATE INDEX "business_invitations_business_id_idx" ON "business_invitations"("business_id");

-- CreateIndex
CREATE INDEX "business_invitations_active_idx" ON "business_invitations"("active");

-- AddForeignKey
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_invitations" ADD CONSTRAINT "business_invitations_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
