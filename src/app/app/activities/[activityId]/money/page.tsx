import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { RequestRemovalButton } from "../_components/FinanceActions";

export default async function MoneyActivitiesPage({ params }: { params: Promise<{ activityId: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const activityId = Number((await params).activityId);
  const access = await getEventAccess(session.userId, activityId);
  if (!access) notFound();
  const canRequestRemoval = access.isAdmin || access.eventRole === "FINANCE_REVIEWER";

  const records = await prisma.financialActivity.findMany({
    where: { eventId: activityId, status: { not: "VOIDED" } },
    include: { createdBy: { select: { email: true } }, documents: { select: { id: true } } },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">Money activities</h2>
          <p className="mt-1 text-sm text-slate-600">Every amount received or spent, explained in plain language.</p>
        </div>
        <Link href={`/app/activities/${activityId}/money/new`} className="rounded-full bg-yellow-300 px-5 py-3 text-center text-sm font-bold text-emerald-950 hover:bg-yellow-200">Add money record</Link>
      </div>

      {records.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <p className="font-bold">No money activities yet</p>
          <p className="mt-1 text-sm text-slate-500">Add the first income or expense for this activity.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-3">Record</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Proof</th><th className="px-3 py-3">Added by</th>{canRequestRemoval && <th className="px-3 py-3">Action</th>}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="px-3 py-4"><p className="font-bold text-slate-900">{record.title}</p><p className="text-xs text-slate-500">{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(record.occurredAt)}</p></td>
                  <td className="px-3 py-4 font-semibold">{record.type}</td>
                  <td className="px-3 py-4 font-bold">{new Intl.NumberFormat("en-PH", { style: "currency", currency: record.currency }).format(Number(record.amount))}</td>
                  <td className="px-3 py-4"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{record.status}</span></td>
                  <td className="px-3 py-4">{record.documents.length ? `${record.documents.length} file(s)` : "None yet"}</td>
                  <td className="px-3 py-4 text-slate-600">{record.createdBy.email}</td>
                  {canRequestRemoval && <td className="px-3 py-4"><RequestRemovalButton recordId={record.id} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
