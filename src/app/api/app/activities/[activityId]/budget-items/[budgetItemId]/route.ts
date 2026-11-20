import { NextRequest, NextResponse } from "next/server";
import { appendAuditEntry } from "@/lib/audit";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function canEditBudget(access: NonNullable<Awaited<ReturnType<typeof getEventAccess>>>) {
  return access.isAdmin || ["FINANCE_REVIEWER", "ORGANIZER", "STAFF"].includes(access.eventRole ?? "");
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ activityId: string; budgetItemId: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });
  const resolved = await params;
  const activityId = Number(resolved.activityId);
  const budgetItemId = Number(resolved.budgetItemId);
  const access = await getEventAccess(session.userId, activityId);
  if (!access) return NextResponse.json({ message: "Activity not found." }, { status: 404 });
  if (!canEditBudget(access)) return NextResponse.json({ message: "Your role cannot edit budget items." }, { status: 403 });

  const existing = await prisma.eventBudgetItem.findFirst({ where: { id: budgetItemId, eventId: activityId } });
  if (!existing) return NextResponse.json({ message: "Budget item not found." }, { status: 404 });
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const category = String(body.category ?? "").trim();
  const plannedAmount = Number(body.plannedAmount);
  if (
    !name ||
    name.length > 120 ||
    category.length > 80 ||
    !Number.isFinite(plannedAmount) ||
    plannedAmount < 0 ||
    plannedAmount > 999_999_999_999.99
  ) {
    return NextResponse.json({ message: "Enter a valid name and planned amount." }, { status: 400 });
  }

  const item = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.eventBudgetItem.update({ where: { id: budgetItemId }, data: { name, category: category || null, plannedAmount } });
    await appendAuditEntry(transaction, {
      businessId: access.event.businessId,
      actorId: session.userId,
      action: "EVENT_BUDGET_ITEM_UPDATED",
      entityType: "EventBudgetItem",
      entityId: String(updated.id),
      summary: `Updated budget item: ${updated.name}`,
      metadata: { eventId: activityId, previousAmount: String(existing.plannedAmount), plannedAmount: String(updated.plannedAmount) },
    });
    return updated;
  });
  return NextResponse.json({ item });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ activityId: string; budgetItemId: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });
  const resolved = await params;
  const activityId = Number(resolved.activityId);
  const budgetItemId = Number(resolved.budgetItemId);
  const access = await getEventAccess(session.userId, activityId);
  if (!access?.isAdmin) return NextResponse.json({ message: "Only an administrator can remove a budget item." }, { status: 403 });

  const existing = await prisma.eventBudgetItem.findFirst({ where: { id: budgetItemId, eventId: activityId }, include: { _count: { select: { activities: true } } } });
  if (!existing) return NextResponse.json({ message: "Budget item not found." }, { status: 404 });
  if (existing._count.activities > 0) return NextResponse.json({ message: "This budget item is already used by money records and cannot be removed." }, { status: 409 });

  await prisma.$transaction(async (transaction) => {
    await transaction.eventBudgetItem.delete({ where: { id: budgetItemId } });
    await appendAuditEntry(transaction, {
      businessId: access.event.businessId,
      actorId: session.userId,
      action: "EVENT_BUDGET_ITEM_DELETED",
      entityType: "EventBudgetItem",
      entityId: String(budgetItemId),
      summary: `Removed unused budget item: ${existing.name}`,
      metadata: { eventId: activityId, plannedAmount: String(existing.plannedAmount) },
    });
  });
  return NextResponse.json({ success: true });
}
