import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import BudgetManager from "../_components/BudgetManager";

export default async function BudgetPage({ params }: { params: Promise<{ activityId: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const activityId = Number((await params).activityId);
  const access = await getEventAccess(session.userId, activityId);
  if (!access) notFound();
  const budgetItems = await prisma.eventBudgetItem.findMany({ where: { eventId: activityId }, include: { activities: { where: { status: { not: "VOIDED" }, type: { in: ["EXPENSE", "REIMBURSEMENT"] } }, select: { amount: true } } }, orderBy: { createdAt: "asc" } });
  const items = budgetItems.map((item) => ({ id: item.id, name: item.name, category: item.category, plannedAmount: Number(item.plannedAmount), actualAmount: item.activities.reduce((sum, activity) => sum + Number(activity.amount), 0) }));
  const canEdit = access.isAdmin || ["FINANCE_REVIEWER", "ORGANIZER", "STAFF"].includes(access.eventRole ?? "");

  return <section className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-2xl font-bold">Event budget</h2><p className="mt-1 text-sm text-slate-600">Plan categories first, then compare them with actual money records.</p><div className="mt-6"><BudgetManager activityId={activityId} currency={access.event.currency} items={items} canEdit={canEdit} canDelete={access.isAdmin} /></div></section>;
}
