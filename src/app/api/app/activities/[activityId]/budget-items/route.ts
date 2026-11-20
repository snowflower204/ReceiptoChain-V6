import { NextRequest, NextResponse } from "next/server";
import { appendAuditEntry } from "@/lib/audit";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function canEditBudget(access: NonNullable<Awaited<ReturnType<typeof getEventAccess>>>) {
  return access.isAdmin || ["FINANCE_REVIEWER", "ORGANIZER", "STAFF"].includes(access.eventRole ?? "");
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ activityId: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });
  const activityId = Number((await params).activityId);
  const access = await getEventAccess(session.userId, activityId);
  if (!access) return NextResponse.json({ message: "Activity not found." }, { status: 404 });
  const items = await prisma.eventBudgetItem.findMany({ where: { eventId: activityId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ activityId: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });
  const activityId = Number((await params).activityId);
  const access = await getEventAccess(session.userId, activityId);
  if (!access) return NextResponse.json({ message: "Activity not found." }, { status: 404 });
  if (!canEditBudget(access)) return NextResponse.json({ message: "Your role cannot add budget items." }, { status: 403 });

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const category = String(body.category ?? "").trim();
  const notes = String(body.notes ?? "").trim();
  const plannedAmount = Number(body.plannedAmount);
  if (
    !name ||
    name.length > 120 ||
    category.length > 80 ||
    notes.length > 500 ||
    !Number.isFinite(plannedAmount) ||
    plannedAmount < 0 ||
    plannedAmount > 999_999_999_999.99
  ) {
    return NextResponse.json({ message: "Enter a budget item name and a valid planned amount." }, { status: 400 });
  }

  const item = await prisma.$transaction(async (transaction) => {
    const created = await transaction.eventBudgetItem.create({
      data: { businessId: access.event.businessId, eventId: activityId, name, category: category || null, plannedAmount, notes: notes || null },
    });
    await appendAuditEntry(transaction, {
      businessId: access.event.businessId,
      actorId: session.userId,
      action: "EVENT_BUDGET_ITEM_CREATED",
      entityType: "EventBudgetItem",
      entityId: String(created.id),
      summary: `Added budget item: ${created.name}`,
      metadata: { eventId: activityId, plannedAmount: String(created.plannedAmount), category: created.category },
    });
    return created;
  });
  return NextResponse.json({ item }, { status: 201 });
}
