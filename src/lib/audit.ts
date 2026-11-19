import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";

type AuditInput = {
  businessId: number;
  actorId: number;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata?: Prisma.InputJsonValue;
};

export async function appendAuditEntry(
  transaction: Prisma.TransactionClient,
  input: AuditInput
) {
  const previous = await transaction.auditEntry.findFirst({
    where: { businessId: input.businessId },
    orderBy: { id: "desc" },
    select: { entryHash: true },
  });
  const createdAt = new Date();
  const payload = JSON.stringify({
    previousHash: previous?.entryHash ?? null,
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    summary: input.summary,
    metadata: input.metadata ?? null,
    createdAt: createdAt.toISOString(),
  });
  const entryHash = createHash("sha256").update(payload).digest("hex");

  return transaction.auditEntry.create({
    data: {
      businessId: input.businessId,
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
      metadata: input.metadata,
      previousHash: previous?.entryHash ?? null,
      entryHash,
      createdAt,
    },
  });
}
