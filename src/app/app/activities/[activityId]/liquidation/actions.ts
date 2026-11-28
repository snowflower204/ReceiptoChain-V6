"use server";

import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { appendAuditEntry } from "@/lib/audit";

export async function saveLiquidation(eventId: number, reportId: number | null, form: FormData) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const access = await getEventAccess(session.userId, eventId);
  if (!access || (access.businessRole !== "OWNER" && access.eventRole !== "FINANCE_REVIEWER")) notFound();
  const path = `/app/activities/${eventId}/liquidation`;
  const notes = String(form.get("notes") ?? "").trim();
  const ids = [...new Set(form.getAll("record").map(Number))];
  if (notes.length > 1000 || ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) redirect(`${path}?save=invalid`);

  let saved: boolean;
  try {
    saved = await prisma.$transaction(async (tx) => {
      const selected = await tx.financialActivity.findMany({
        where: { id: { in: ids }, eventId, status: "RECONCILED", type: { in: ["INCOME", "EXPENSE", "REFUND", "REIMBURSEMENT"] }, paymentConfirmation: { isNot: null }, liquidationItems: { none: reportId === null ? {} : { reportId: { not: reportId } } } },
        select: { id: true, occurredAt: true },
        orderBy: { occurredAt: "asc" },
      });
      if (!selected.length || selected.length !== ids.length) return false;
      const details = { notes: notes || null, periodStart: selected[0].occurredAt, periodEnd: selected[selected.length - 1].occurredAt };
      let id: number;
      if (reportId === null) {
        const draft = await tx.liquidationReport.create({ data: { ...details, businessId: access.event.businessId, eventId, createdById: session.userId, reportNumber: `LIQ-${randomUUID()}` }, select: { id: true } });
        id = draft.id;
      } else {
        const draft = await tx.liquidationReport.updateMany({ where: { id: reportId, eventId, status: "DRAFT" }, data: details });
        if (!draft.count) return false;
        id = reportId;
        await tx.liquidationItem.deleteMany({ where: { reportId: id, activityId: { notIn: ids } } });
      }
      const existing = await tx.liquidationItem.findMany({ where: { reportId: id }, select: { activityId: true } });
      const included = new Set(existing.map((item) => item.activityId));
      await tx.liquidationItem.createMany({ data: selected.filter((record) => !included.has(record.id)).map((record) => ({ reportId: id, activityId: record.id, businessId: access.event.businessId, includedById: session.userId })) });
      await appendAuditEntry(tx, { businessId: access.event.businessId, actorId: session.userId, action: reportId === null ? "LIQUIDATION_DRAFT_CREATED" : "LIQUIDATION_DRAFT_UPDATED", entityType: "LiquidationReport", entityId: String(id), summary: "Saved liquidation draft", metadata: { recordIds: ids } });
      return true;
    });
  } catch (error) {
    if (typeof error !== "object" || !error || !("code" in error) || error.code !== "P2002") throw error;
    saved = false;
  }
  redirect(`${path}?save=${saved ? "done" : "invalid"}`);
}
