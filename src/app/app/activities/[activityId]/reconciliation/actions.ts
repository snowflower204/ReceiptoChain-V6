"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { appendAuditEntry } from "@/lib/audit";

export async function matchPayment(eventId: number, recordId: number, data: FormData) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const access = await getEventAccess(session.userId, eventId);
  if (!access || (!access.isAdmin && access.eventRole !== "FINANCE_REVIEWER")) notFound();
  const path = `/app/activities/${eventId}/reconciliation`;
  if (data.get("verified") !== "on") redirect(`${path}?match=not-ready`);

  const matched = await prisma.$transaction(async (tx) => {
    const result = await tx.financialActivity.updateMany({
      where: { id: recordId, eventId, status: "CONFIRMED", paymentConfirmation: { isNot: null } },
      data: { status: "RECONCILED", reconciledAt: new Date(), reconciledById: session.userId },
    });
    if (result.count !== 1) return false;
    await appendAuditEntry(tx, {
      businessId: access.event.businessId,
      actorId: session.userId,
      action: "PAYMENT_RECONCILED",
      entityType: "FinancialActivity",
      entityId: String(recordId),
      summary: "Reviewer matched confirmed payment against an external record",
    });
    return true;
  });
  revalidatePath(path);
  redirect(`${path}?match=${matched ? "done" : "not-ready"}`);
}
