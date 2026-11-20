import { NextRequest, NextResponse } from "next/server";
import { appendAuditEntry } from "@/lib/audit";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });

  const documentId = Number((await params).documentId);
  const document = await prisma.evidenceDocument.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      businessId: true,
      status: true,
      fileName: true,
      submittedById: true,
      activity: { select: { id: true, eventId: true, title: true } },
      reimbursement: { select: { eventId: true } },
    },
  });
  if (!document) return NextResponse.json({ message: "Evidence document not found." }, { status: 404 });

  const eventId = document.activity?.eventId ?? document.reimbursement?.eventId;
  if (!eventId) return NextResponse.json({ message: "Evidence document is not attached correctly." }, { status: 409 });
  const access = await getEventAccess(session.userId, eventId);
  if (!access || (!access.isAdmin && access.eventRole !== "FINANCE_REVIEWER")) {
    return NextResponse.json({ message: "Only an administrator or finance reviewer can review evidence." }, { status: 403 });
  }
  if (document.submittedById === session.userId) {
    return NextResponse.json({ message: "The person who submitted evidence cannot review their own file." }, { status: 403 });
  }

  const body = await request.json();
  const decision = body.decision === "ACCEPTED" ? "ACCEPTED" : body.decision === "REJECTED" ? "REJECTED" : null;
  const reviewNotes = typeof body.reviewNotes === "string" ? body.reviewNotes.trim() : "";
  if (!decision || reviewNotes.length > 500 || (decision === "REJECTED" && reviewNotes.length < 5)) {
    return NextResponse.json({ message: "Choose a decision and explain rejected evidence." }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const reviewed = await transaction.evidenceDocument.updateMany({
        where: { id: documentId, status: "PENDING" },
        data: { status: decision, reviewedById: session.userId, reviewedAt: new Date(), reviewNotes: reviewNotes || null },
      });
      if (reviewed.count !== 1) throw new Error("DOCUMENT_ALREADY_REVIEWED");

      await appendAuditEntry(transaction, {
        businessId: document.businessId,
        actorId: session.userId,
        action: decision === "ACCEPTED" ? "EVIDENCE_DOCUMENT_ACCEPTED" : "EVIDENCE_DOCUMENT_REJECTED",
        entityType: "EvidenceDocument",
        entityId: String(document.id),
        summary: `${decision === "ACCEPTED" ? "Accepted" : "Rejected"} evidence: ${document.fileName}`,
        metadata: { activityId: document.activity?.id ?? null, reviewNotes: reviewNotes || null, paymentStatusChanged: false },
      });
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "DOCUMENT_ALREADY_REVIEWED") {
      return NextResponse.json({ message: "This evidence has already been reviewed." }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ success: true, decision });
}
