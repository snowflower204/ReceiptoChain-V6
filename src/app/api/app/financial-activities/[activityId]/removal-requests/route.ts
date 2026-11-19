import { NextRequest, NextResponse } from "next/server";
import { appendAuditEntry } from "@/lib/audit";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ activityId: string }> }
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });

  const financialActivityId = Number((await params).activityId);
  const activity = await prisma.financialActivity.findUnique({
    where: { id: financialActivityId },
    select: { id: true, eventId: true, businessId: true, title: true, status: true },
  });
  if (!activity) return NextResponse.json({ message: "Money record not found." }, { status: 404 });

  const access = await getEventAccess(session.userId, activity.eventId);
  const canRequest = access?.isAdmin || access?.eventRole === "FINANCE_REVIEWER";
  if (!access || !canRequest) {
    return NextResponse.json({ message: "Only the finance team or an administrator can request removal." }, { status: 403 });
  }
  if (activity.status === "VOIDED") {
    return NextResponse.json({ message: "This record is already removed from active totals." }, { status: 409 });
  }

  const body = await request.json();
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 10 || reason.length > 500) {
    return NextResponse.json({ message: "Explain the reason in at least 10 characters." }, { status: 400 });
  }

  const existing = await prisma.financialActivityRemovalRequest.findFirst({
    where: { activityId: financialActivityId, status: "PENDING" },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ message: "A removal request is already waiting for administrator review." }, { status: 409 });
  }

  const removalRequest = await prisma.$transaction(async (transaction) => {
    const created = await transaction.financialActivityRemovalRequest.create({
      data: {
        businessId: activity.businessId,
        activityId: financialActivityId,
        requestedById: session.userId,
        reason,
        previousStatus: activity.status,
      },
      select: { id: true, status: true },
    });

    await appendAuditEntry(transaction, {
      businessId: activity.businessId,
      actorId: session.userId,
      action: "FINANCIAL_ACTIVITY_REMOVAL_REQUESTED",
      entityType: "FinancialActivity",
      entityId: String(activity.id),
      summary: `Requested removal of money record: ${activity.title}`,
      metadata: { requestId: created.id, reason },
    });

    return created;
  });

  return NextResponse.json({ removalRequest }, { status: 201 });
}
