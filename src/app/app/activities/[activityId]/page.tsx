import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency }).format(value);
}

export default async function ActivityOverview({ params }: { params: Promise<{ activityId: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const activityId = Number((await params).activityId);
  const access = await getEventAccess(session.userId, activityId);
  if (!access) notFound();

  const [records, evidencePending, removalPending, reports, receiptsCollected] = await Promise.all([
    prisma.financialActivity.findMany({
      where: { eventId: activityId, status: { not: "VOIDED" } },
      select: { type: true, status: true, paymentConfirmation: { select: { amount: true } } },
    }),
    prisma.evidenceDocument.count({
      where: { activity: { eventId: activityId }, status: "PENDING" },
    }),
    prisma.financialActivityRemovalRequest.count({
      where: { activity: { eventId: activityId }, status: "PENDING" },
    }),
    prisma.liquidationReport.count({ where: { eventId: activityId } }),
    prisma.evidenceDocument.count({ where: { activity: { eventId: activityId, status: { not: "VOIDED" } }, kind: { in: ["OFFICIAL_RECEIPT", "EXPENSE_RECEIPT", "SALES_INVOICE"] } } }),
  ]);

  const cleared = records.filter((item) => item.status === "CONFIRMED" || item.status === "RECONCILED");
  const income = cleared.filter((item) => item.type === "INCOME").reduce((sum, item) => sum + Number(item.paymentConfirmation?.amount ?? 0), 0);
  const expenses = cleared.filter((item) => ["EXPENSE", "REFUND", "REIMBURSEMENT"].includes(item.type)).reduce((sum, item) => sum + Number(item.paymentConfirmation?.amount ?? 0), 0);
  const reconciled = records.filter((item) => item.status === "RECONCILED").length;

  const cards = [
    { label: "Receipts collected", value: String(receiptsCollected), helper: "Uploaded receipts and sales invoices, including those awaiting review" },
    { label: "Money received", value: money(income, access.event.currency), helper: "Confirmed income recorded" },
    { label: "Money spent", value: money(expenses, access.event.currency), helper: "Expenses and reimbursements" },
    { label: "Matched records", value: `${reconciled} of ${records.length}`, helper: "Reconciled with actual payments" },
    { label: "Needs attention", value: String(evidencePending + removalPending), helper: `${evidencePending} evidence · ${removalPending} removal request` },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{card.value}</p>
            <p className="mt-2 text-xs text-slate-500">{card.helper}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">What needs to happen next?</h2>
          <p className="mt-1 text-sm text-slate-600">A plain-language guide to keep the finance workflow moving.</p>
          <div className="mt-5 space-y-3">
            <Link href={`/app/activities/${activityId}/money`} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50">
              <div><p className="font-bold">Record money in or money out</p><p className="text-sm text-slate-500">Add an income, expense, refund, or adjustment.</p></div><span aria-hidden>→</span>
            </Link>
            <Link href={`/app/activities/${activityId}/payments`} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50">
              <div><p className="font-bold">Review proof and confirm payments</p><p className="text-sm text-slate-500">Evidence review never confirms a payment automatically.</p></div><span aria-hidden>→</span>
            </Link>
            <Link href={`/app/activities/${activityId}/reconciliation`} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50">
              <div><p className="font-bold">Match and verify records</p><p className="text-sm text-slate-500">Compare recorded entries with actual money received or spent.</p></div><span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        <aside className="rounded-3xl bg-yellow-200 p-6 text-emerald-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.16em]">Activity progress</p>
          <p className="mt-3 text-4xl font-black">{reports > 0 ? "Report started" : "Getting ready"}</p>
          <p className="mt-3 text-sm leading-6">The liquidation report becomes the final summary after records are confirmed and reconciled.</p>
          <Link href={`/app/activities/${activityId}/liquidation`} className="mt-6 inline-flex rounded-full bg-emerald-950 px-5 py-3 text-sm font-bold text-white">View liquidation</Link>
        </aside>
      </section>
    </div>
  );
}
