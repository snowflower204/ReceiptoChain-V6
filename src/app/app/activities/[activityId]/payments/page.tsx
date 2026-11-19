import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function PaymentsPage({ params }: { params: Promise<{ activityId: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const activityId = Number((await params).activityId);
  const access = await getEventAccess(session.userId, activityId);
  if (!access) notFound();

  const records = await prisma.financialActivity.findMany({
    where: { eventId: activityId, status: { not: "VOIDED" } },
    include: {
      documents: { orderBy: { createdAt: "desc" } },
      paymentConfirmations: { include: { confirmedBy: { select: { email: true } } }, orderBy: { confirmedAt: "desc" } },
      receipt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold">Payments & receipts</h2>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">Reviewing proof and confirming payment are separate actions. A screenshot can be accepted without claiming the money was received.</p>
      <div className="mt-6 space-y-4">
        {records.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Money records will appear here after they are added.</p>}
        {records.map((record) => {
          const evidence = record.documents[0];
          const confirmation = record.paymentConfirmations[0];
          return (
            <article key={record.id} className="rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-col justify-between gap-3 md:flex-row">
                <div><h3 className="font-bold text-slate-950">{record.title}</h3><p className="text-sm text-slate-500">{new Intl.NumberFormat("en-PH", { style: "currency", currency: record.currency }).format(Number(record.amount))}</p></div>
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className={`rounded-full px-3 py-1 ${evidence?.status === "ACCEPTED" ? "bg-emerald-100 text-emerald-800" : "bg-yellow-100 text-yellow-900"}`}>Proof: {evidence?.status ?? "NOT SUBMITTED"}</span>
                  <span className={`rounded-full px-3 py-1 ${confirmation ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>Payment: {confirmation ? "CONFIRMED" : "NOT CONFIRMED"}</span>
                  <span className={`rounded-full px-3 py-1 ${record.receipt ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>Receipt: {record.receipt ? "ISSUED" : "NOT ISSUED"}</span>
                </div>
              </div>
              {confirmation && <p className="mt-3 text-xs text-slate-500">Confirmed independently by {confirmation.confirmedBy.email}</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
