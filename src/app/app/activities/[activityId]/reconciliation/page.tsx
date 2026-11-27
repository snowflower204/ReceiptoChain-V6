import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { RestoreRecordButton, ReviewRemovalButtons } from "../_components/FinanceActions";
import { matchPayment } from "./actions";
import Link from "next/link";

export default async function ReconciliationPage({ params, searchParams }: { params: Promise<{ activityId: string }>; searchParams: Promise<{ match?: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const activityId = Number((await params).activityId);
  const access = await getEventAccess(session.userId, activityId);
  if (!access) notFound();

  const [records, removals] = await Promise.all([
    prisma.financialActivity.findMany({ where: { eventId: activityId }, include: { paymentConfirmation: { select: { amount: true, reference: true } } }, orderBy: { updatedAt: "desc" } }),
    prisma.financialActivityRemovalRequest.findMany({
      where: { activity: { eventId: activityId } },
      include: { activity: { select: { title: true } }, requestedBy: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const matched = records.filter((record) => record.status === "RECONCILED");
  const toMatch = records.filter((record) => record.status === "CONFIRMED" && record.paymentConfirmation);
  const awaiting = records.filter((record) => !["RECONCILED", "VOIDED"].includes(record.status) && !(record.status === "CONFIRMED" && record.paymentConfirmation));
  const canMatch = access.isAdmin || access.eventRole === "FINANCE_REVIEWER";
  const matchFeedback = (await searchParams).match;
  const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: access.event.currency });
  const recentlyRemoved = records.filter((record) => record.status === "VOIDED" && record.restorableUntil && record.restorableUntil > new Date());

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold">Reconciliation</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">Match what ReceiptoChain recorded with the actual money received or spent. Differences stay visible until someone resolves them.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-yellow-50 p-5"><p className="text-sm font-semibold text-yellow-900">To match</p><p className="mt-1 text-3xl font-black">{toMatch.length}</p></div>
          <div className="rounded-2xl bg-emerald-50 p-5"><p className="text-sm font-semibold text-emerald-900">Matched</p><p className="mt-1 text-3xl font-black">{matched.length}</p></div>
          <div className="rounded-2xl bg-slate-100 p-5"><p className="text-sm font-semibold text-slate-700">Removal requests</p><p className="mt-1 text-3xl font-black">{removals.filter((item) => item.status === "PENDING").length}</p></div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold">Ready to match</h3>
        <p className="mt-1 text-sm text-slate-600">Compare the confirmed amount and reference with your bank, wallet, or cash record before marking it matched.</p>
        {matchFeedback && <p role="status" className="mt-3 text-sm font-semibold">{matchFeedback === "done" ? "Payment matched." : "This payment could not be matched. It may already be matched or no longer confirmed."}</p>}
        {toMatch.length === 0 && <p className="mt-3 text-sm text-slate-500">No confirmed payments waiting to be matched.</p>}
        {toMatch.map((record) => (
          <div key={record.id} className="mt-3 rounded-xl border border-slate-200 p-4">
            <p className="font-bold">{record.title}</p>
            <p className="text-sm text-slate-600">{money.format(Number(record.paymentConfirmation!.amount))} · Reference: {record.paymentConfirmation!.reference}</p>
            {canMatch && <form action={matchPayment.bind(null, activityId, record.id)} className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm"><input name="verified" type="checkbox" required /> Amount and reference agree</label>
              <button className="rounded-full bg-emerald-800 px-4 py-2 text-sm font-bold text-white">Mark as matched</button>
            </form>}
          </div>
        ))}
        <h3 className="mt-6 text-lg font-bold">Not ready to match ({awaiting.length})</h3>
        <p className="mt-1 text-sm text-slate-600">Accepting evidence isn't payment confirmation. Check these records in <Link href={`/app/activities/${activityId}/payments`} className="font-bold text-emerald-800 underline">Payments &amp; receipts</Link>.</p>
        {awaiting.map((record) => <p key={record.id} className="mt-2 text-sm">{record.title} · {record.status.toLowerCase().replaceAll("_", " ")}</p>)}
      </section>

      {access.isAdmin && (
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold">Admin review</h3>
          <p className="mt-1 text-sm text-slate-500">Finance reviewers may request removal, but only an administrator can approve it.</p>
          <div className="mt-4 space-y-3">
            {removals.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No removal requests.</p>}
            {removals.map((request) => <div key={request.id} className="rounded-xl border border-slate-200 p-4 text-sm"><div className="flex justify-between gap-3"><p className="font-bold">{request.activity.title}</p><span className="font-bold text-slate-600">{request.status}</span></div><p className="mt-1 text-slate-600">{request.reason}</p><p className="mt-2 text-xs text-slate-400">Requested by {request.requestedBy.email}</p>{request.status === "PENDING" && <ReviewRemovalButtons requestId={request.id} />}</div>)}
          </div>
          <h3 className="mt-7 text-lg font-bold">Recently removed · 30 days</h3>
          <p className="mt-1 text-sm text-slate-500">{recentlyRemoved.length} record(s) can currently be restored. Their audit history is retained permanently.</p>
          <div className="mt-4 space-y-3">
            {recentlyRemoved.map((record) => <div key={record.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"><div><p className="font-bold">{record.title}</p><p className="text-xs text-slate-500">Restorable until {record.restorableUntil ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(record.restorableUntil) : "—"}</p></div><RestoreRecordButton recordId={record.id} /></div>)}
          </div>
        </section>
      )}
    </div>
  );
}
