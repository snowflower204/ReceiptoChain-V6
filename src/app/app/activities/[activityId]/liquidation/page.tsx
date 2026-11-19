import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function LiquidationPage({ params }: { params: Promise<{ activityId: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const activityId = Number((await params).activityId);
  const access = await getEventAccess(session.userId, activityId);
  if (!access) notFound();

  const reports = await prisma.liquidationReport.findMany({
    where: { eventId: activityId },
    include: { createdBy: { select: { email: true } }, finalizedBy: { select: { email: true } }, items: { include: { activity: { select: { amount: true, type: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><h2 className="text-2xl font-bold">Liquidation report</h2><p className="mt-1 max-w-3xl text-sm text-slate-600">The final, readable summary of reconciled income and expenses for this activity.</p></div>
        {(access.isAdmin || access.eventRole === "FINANCE_REVIEWER") && <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-900">Finance preparation access</span>}
      </div>

      {reports.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center"><p className="font-bold">No liquidation report yet</p><p className="mt-1 text-sm text-slate-500">The finance team can begin after the activity’s records are reconciled.</p></div>
      ) : (
        <div className="mt-6 space-y-4">
          {reports.map((report) => {
            const total = report.items.reduce((sum, item) => sum + Number(item.activity.amount), 0);
            return <article key={report.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{report.reportNumber}</p><h3 className="mt-1 text-lg font-bold">{report.status === "FINALIZED" ? "Final liquidation report" : "Draft liquidation report"}</h3></div><span className="h-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{report.status}</span></div><div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3"><div><p className="text-slate-500">Included records</p><p className="font-bold">{report.items.length}</p></div><div><p className="text-slate-500">Included value</p><p className="font-bold">{new Intl.NumberFormat("en-PH", { style: "currency", currency: access.event.currency }).format(total)}</p></div><div><p className="text-slate-500">Prepared by</p><p className="font-bold">{report.createdBy.email}</p></div></div></article>;
          })}
        </div>
      )}
    </section>
  );
}
