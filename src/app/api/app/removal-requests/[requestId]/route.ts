import { NextRequest, NextResponse } from "next/server";
import { appendAuditEntry } from "@/lib/audit";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });

  const requestId = Number((await params).requestId);
  const removal = await prisma.financialActivityRemovalRequest.findUnique({
    where: { id: requestId },
    include: { activity: { select: { id: true, eventId: true, title: true, status: true } } },
  });
  if (!removal) return NextResponse.json({ message: "Removal request not found." }, { status: 404 });

  const access = await getEventAccess(session.userId, removal.activity.eventId);
  if (!access?.isAdmin) {
    return NextResponse.json({ message: "Only an administrator can approve or reject removal." }, { status: 403 });
  }
  if (removal.requestedById === session.userId) {
    return NextResponse.json({ message: "The requester cannot approve their own removal request." }, { status: 403 });
  }
  if (removal.status !== "PENDING") {
    return NextResponse.json({ message: "This request has already been reviewed." }, { status: 409 });
  }

  const body = await request.json();
  const decision = body.decision === "APPROVED" ? "APPROVED" : body.decision === "REJECTED" ? "REJECTED" : null;
  const reviewNotes = typeof body.reviewNotes === "string" ? body.reviewNotes.trim() : "";
  if (!decision) return NextResponse.json({ message: "Choose approve or reject." }, { status: 400 });

  try {
    await prisma.$transaction(async (transaction) => {
      const reviewedAt = new Date();
      const claimed = await transaction.financialActivityRemovalRequest.updateMany({
        where: { id: requestId, status: "PENDING" },
        data: { status: decision, reviewedById: session.userId, reviewedAt, reviewNotes: reviewNotes || null },
      });
      if (claimed.count !== 1) throw new Error("REQUEST_ALREADY_REVIEWED");

      if (decision === "APPROVED") {
        await transaction.financialActivity.update({
          where: { id: removal.activityId },
          data: {
            status: "VOIDED",
            voidedById: session.userId,
            voidedAt: reviewedAt,
            voidReason: removal.reason,
            restorableUntil: new Date(reviewedAt.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }

      await appendAuditEntry(transaction, {
        businessId: removal.businessId,
        actorId: session.userId,
        action: decision === "APPROVED" ? "FINANCIAL_ACTIVITY_REMOVAL_APPROVED" : "FINANCIAL_ACTIVITY_REMOVAL_REJECTED",
        entityType: "FinancialActivity",
        entityId: String(removal.activityId),
        summary: `${decision === "APPROVED" ? "Approved" : "Rejected"} removal of money record: ${removal.activity.title}`,
        metadata: { requestId, reviewNotes: reviewNotes || null },
      });
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "REQUEST_ALREADY_REVIEWED") {
      return NextResponse.json({ message: "This request has already been reviewed." }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ success: true, decision });
}
