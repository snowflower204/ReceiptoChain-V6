import { NextResponse } from "next/server";
import { appendAuditEntry } from "@/lib/audit";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ activityId: string }> }
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });

  const activityId = Number((await params).activityId);
  const activity = await prisma.financialActivity.findUnique({
    where: { id: activityId },
    select: { id: true, eventId: true, businessId: true, title: true, status: true, restorableUntil: true },
  });
  if (!activity) return NextResponse.json({ message: "Money record not found." }, { status: 404 });

  const access = await getEventAccess(session.userId, activity.eventId);
  if (!access?.isAdmin) return NextResponse.json({ message: "Only an administrator can restore a record." }, { status: 403 });
  if (activity.status !== "VOIDED" || !activity.restorableUntil || activity.restorableUntil <= new Date()) {
    return NextResponse.json({ message: "This record is not within its 30-day restoration period." }, { status: 409 });
  }

  const approvedRemoval = await prisma.financialActivityRemovalRequest.findFirst({
    where: { activityId, status: "APPROVED" },
    orderBy: { reviewedAt: "desc" },
    select: { id: true, previousStatus: true },
  });
  if (!approvedRemoval) return NextResponse.json({ message: "Approved removal history was not found." }, { status: 409 });

  try {
    await prisma.$transaction(async (transaction) => {
      const restored = await transaction.financialActivity.updateMany({
        where: { id: activityId, status: "VOIDED", restorableUntil: { gt: new Date() } },
        data: { status: approvedRemoval.previousStatus, voidedById: null, voidedAt: null, voidReason: null, restorableUntil: null },
      });
      if (restored.count !== 1) throw new Error("RESTORE_WINDOW_CLOSED");

      await appendAuditEntry(transaction, {
        businessId: activity.businessId,
        actorId: session.userId,
        action: "FINANCIAL_ACTIVITY_RESTORED",
        entityType: "FinancialActivity",
        entityId: String(activityId),
        summary: `Restored money record: ${activity.title}`,
        metadata: { removalRequestId: approvedRemoval.id, restoredStatus: approvedRemoval.previousStatus },
      });
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "RESTORE_WINDOW_CLOSED") {
      return NextResponse.json({ message: "This record was already restored or its restoration period ended." }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ success: true });
}
