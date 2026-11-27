import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { appendAuditEntry } from "@/lib/audit";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function getErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return undefined;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ activityId: string }> }
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });

  const activityId = Number((await params).activityId);
  const activity = await prisma.financialActivity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      eventId: true,
      businessId: true,
      createdById: true,
      title: true,
      amount: true,
      status: true,
      customerRegistration: { select: { user: { select: { email: true } } } },
      documents: { where: { status: "ACCEPTED" }, select: { id: true }, take: 1 },
      paymentConfirmation: { select: { id: true } },
    },
  });
  if (!activity) return NextResponse.json({ message: "Money record not found." }, { status: 404 });

  const access = await getEventAccess(session.userId, activity.eventId);
  if (!access || (!access.isAdmin && access.eventRole !== "FINANCE_REVIEWER")) {
    return NextResponse.json({ message: "Only an administrator or finance reviewer can confirm payment." }, { status: 403 });
  }
  if (activity.createdById === session.userId) {
    return NextResponse.json({ message: "A different administrator or finance reviewer must confirm this payment." }, { status: 403 });
  }
  if (activity.status === "VOIDED") {
    return NextResponse.json({ message: "A removed record cannot be confirmed." }, { status: 409 });
  }
  if (activity.paymentConfirmation) {
    return NextResponse.json({ message: "Payment has already been confirmed for this record." }, { status: 409 });
  }
  if (activity.documents.length === 0) {
    return NextResponse.json({ message: "Accepted evidence is required before payment confirmation." }, { status: 409 });
  }

  const body = await request.json();
  const method = typeof body.method === "string" ? body.method.trim() : "";
  const provider = typeof body.provider === "string" ? body.provider.trim() : "";
  const reference = typeof body.reference === "string" ? body.reference.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  if (!method || method.length > 80 || provider.length > 80 || reference.length < 3 || reference.length > 120 || notes.length > 500) {
    return NextResponse.json({ message: "Enter the payment method and a valid bank, wallet, or cash reference." }, { status: 400 });
  }

  try {
    const confirmation = await prisma.$transaction(async (transaction) => {
      const confirmedAt = new Date();
      const claimed = await transaction.financialActivity.updateMany({
        where: { id: activityId, status: { notIn: ["CONFIRMED", "RECONCILED", "VOIDED"] } },
        data: { status: "CONFIRMED", confirmedById: session.userId, confirmedAt },
      });
      if (claimed.count !== 1) throw new Error("ACTIVITY_ALREADY_CONFIRMED");

      const created = await transaction.paymentConfirmation.create({
        data: {
          businessId: activity.businessId,
          activityId,
          confirmedById: session.userId,
          method,
          provider: provider || "MANUAL",
          reference,
          amount: activity.amount,
          confirmedAt,
          notes: notes || null,
        },
        select: { id: true, method: true, provider: true, reference: true, confirmedAt: true },
      });

      if (activity.customerRegistration) {
        const publicToken = randomUUID();
        await transaction.receipt.create({
          data: {
            businessId: activity.businessId, eventId: activity.eventId, activityId,
            issuedById: session.userId, receiptNumber: `EVT-${activity.eventId}-${activityId}`,
            recipientEmail: activity.customerRegistration.user.email, publicToken,
            verificationHash: createHash("sha256").update(publicToken).digest("hex"),
          },
        });
      }

      await appendAuditEntry(transaction, {
        businessId: activity.businessId,
        actorId: session.userId,
        action: "PAYMENT_INDEPENDENTLY_CONFIRMED",
        entityType: "FinancialActivity",
        entityId: String(activityId),
        summary: `Confirmed payment for money record: ${activity.title}`,
        metadata: { confirmationId: created.id, method, provider: created.provider, reference, amount: String(activity.amount) },
      });
      return created;
    });

    return NextResponse.json({ confirmation }, { status: 201 });
  } catch (error: unknown) {
    if (getErrorCode(error) === "P2002" || (error instanceof Error && error.message === "ACTIVITY_ALREADY_CONFIRMED")) {
      return NextResponse.json({ message: "Payment has already been confirmed for this record." }, { status: 409 });
    }
    throw error;
  }
}
