import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { appendAuditEntry } from "@/lib/audit";

const TYPES = ["INCOME", "EXPENSE", "REFUND", "REIMBURSEMENT", "ADJUSTMENT"] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ activityId: string }> }
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });

  const activityId = Number((await params).activityId);
  const access = await getEventAccess(session.userId, activityId);
  if (!access) return NextResponse.json({ message: "Activity not found." }, { status: 404 });

  const records = await prisma.financialActivity.findMany({
    where: { eventId: activityId, status: { not: "VOIDED" } },
    orderBy: { occurredAt: "desc" },
  });

  return NextResponse.json({ records });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ activityId: string }> }
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });

  const activityId = Number((await params).activityId);
  const access = await getEventAccess(session.userId, activityId);
  if (!access) return NextResponse.json({ message: "Activity not found." }, { status: 404 });
  if (!access.isAdmin && access.eventRole === "VIEWER") {
    return NextResponse.json({ message: "Your role can view records but cannot add them." }, { status: 403 });
  }

  const body = await request.json();
  const type = String(body.type ?? "");
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const counterparty = String(body.counterparty ?? "").trim();
  const paymentMethod = String(body.paymentMethod ?? "").trim();
  const amount = Number(body.amount);
  const occurredAt = new Date(`${String(body.occurredAt ?? "")}T00:00:00.000Z`);

  if (!TYPES.includes(type as (typeof TYPES)[number]) || !title || !Number.isFinite(amount) || amount <= 0 || Number.isNaN(occurredAt.getTime())) {
    return NextResponse.json({ message: "Please complete the required money record fields." }, { status: 400 });
  }

  const record = await prisma.$transaction(async (transaction) => {
    const created = await transaction.financialActivity.create({
      data: {
        businessId: access.event.businessId,
        eventId: activityId,
        createdById: session.userId,
        type: type as (typeof TYPES)[number],
        title,
        description: description || null,
        amount,
        currency: access.event.currency,
        occurredAt,
        counterparty: counterparty || null,
        paymentMethod: paymentMethod || null,
        status: "DRAFT",
      },
      select: { id: true, title: true, status: true, type: true, amount: true },
    });

    await appendAuditEntry(transaction, {
      businessId: access.event.businessId,
      actorId: session.userId,
      action: "FINANCIAL_ACTIVITY_CREATED",
      entityType: "FinancialActivity",
      entityId: String(created.id),
      summary: `Created money record: ${created.title}`,
      metadata: { type: created.type, amount: String(created.amount), status: created.status },
    });

    return created;
  });

  return NextResponse.json({ record }, { status: 201 });
}
