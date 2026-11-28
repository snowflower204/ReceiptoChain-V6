import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { saveLiquidation } from "./actions";

export default async function LiquidationPage({ params, searchParams }: {
  params: Promise<{ activityId: string }>;
  searchParams: Promise<{ save?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const eventId = Number((await params).activityId);
  const access = await getEventAccess(session.userId, eventId);
  if (!access) notFound();
  const canEdit = access.businessRole === "OWNER" || access.eventRole === "FINANCE_REVIEWER";
  const feedback = (await searchParams).save;
  const [records, reports, budget, unmatched] = await Promise.all([
    prisma.financialActivity.findMany({
      where: { eventId, status: "RECONCILED", paymentConfirmation: { isNot: null }, type: { in: ["INCOME", "EXPENSE", "REFUND", "REIMBURSEMENT"] } },
      select: { id: true, title: true, type: true, description: true, occurredAt: true,
        paymentConfirmation: { select: { amount: true } },
        budgetItem: { select: { category: true } },
        documents: { where: { status: "ACCEPTED" }, select: { id: true, receiptReference: true, fileName: true } },
        liquidationItems: { select: { reportId: true } } },
      orderBy: { occurredAt: "asc" },
    }),
    prisma.liquidationReport.findMany({ where: { eventId }, include: { createdBy: { select: { email: true } }, _count: { select: { items: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.eventBudgetItem.aggregate({ where: { eventId }, _sum: { plannedAmount: true } }),
    prisma.financialActivity.count({ where: { eventId, status: { notIn: ["RECONCILED", "VOIDED"] } } }),
  ]);
  const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: access.event.currency });
  const date = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: access.event.business.timezone });
  const formatAmount = (record: typeof records[number]) => Number(record.paymentConfirmation?.amount ?? 0);
  const planned = budget._sum.plannedAmount;
  function reportTable(rows: typeof records) {
    const categories = [...new Set(rows.map((row) => row.budgetItem?.category || "Uncategorized"))];
    return categories.map((category) => <div key={category} className="mt-4 overflow-x-auto">
      <h4 className="font-bold text-emerald-900">{category}</h4>
      <table className="w-full text-left text-sm"><thead><tr>{["Date", "Item / Type", "Reference No.", "Amount", "Proof", "Note"].map((label) => <th className="p-2" key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{rows.filter((row) => (row.budgetItem?.category || "Uncategorized") === category).map((row) => <tr key={row.id} className="border-t">
          <td className="p-2">{date.format(row.occurredAt)}</td><th scope="row" className="p-2">{row.title} · {row.type.toLowerCase()}</th>
          <td className="p-2">{row.documents.map((doc) => doc.receiptReference).filter(Boolean).join(", ") || "—"}</td><td className="p-2">{money.format(formatAmount(row))}</td>
          <td className="p-2">{row.documents.map((doc) => <a key={doc.id} className="block font-bold text-emerald-800 underline" href={`/api/app/evidence/${doc.id}/file`}>{doc.fileName}</a>)}</td><td className="p-2">{row.description || "—"}</td>
        </tr>)}</tbody>
      </table></div>);
  }
  function editForm(report?: typeof reports[number]) {
    const eligible = records.filter((record) => !record.liquidationItems.length || record.liquidationItems.some((item) => item.reportId === report?.id));
    if (!eligible.length) return <p className="text-sm text-slate-500">No eligible matched records available.</p>;
    return <form action={saveLiquidation.bind(null, eventId, report?.id ?? null)} className="mt-4 space-y-3 rounded-xl bg-emerald-50 p-4">
      <fieldset><legend className="font-bold">Include matched records</legend>{eligible.map((row) => <label key={row.id} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" name="record" value={row.id} defaultChecked={!report || row.liquidationItems.some((item) => item.reportId === report.id)} />{row.title} · {money.format(formatAmount(row))}</label>)}</fieldset>
      <label className="block text-sm font-bold">Report notes<textarea name="notes" defaultValue={report?.notes ?? ""} maxLength={1000} className="block w-full rounded border p-2" /></label>
      <button className="rounded-full bg-emerald-900 px-5 py-2 font-bold text-white">{report ? "Update draft" : "Create draft"}</button>
    </form>;
  }
  return <section className="space-y-5 rounded-3xl bg-white p-6 shadow-sm">
    <div><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">ReceiptoChain</p><h2 className="text-2xl font-bold">Liquidation report</h2><p className="text-sm text-slate-600">{access.event.business.name} · {access.event.name}</p></div>
    {!!feedback && <p role="status">{feedback === "done" ? "Draft saved." : "Draft could not be saved. Select eligible matched records and try again."}</p>}
    <p className="text-sm text-slate-600">{unmatched} unmatched record(s) need attention and are excluded. Planned expenses for the activity: {planned ? money.format(Number(planned)) : "Not entered"}.</p>
    {reports.map((report) => {
      const rows = records.filter((record) => record.liquidationItems.some((item) => item.reportId === report.id));
      const income = rows.filter((record) => record.type === "INCOME").reduce((sum, row) => sum + formatAmount(row), 0);
      const spent = rows.filter((record) => record.type !== "INCOME").reduce((sum, row) => sum + formatAmount(row), 0);
      return <article key={report.id} className="rounded-xl border border-slate-200 p-4">
        <h3 className="font-bold">{report.status === "DRAFT" ? "Draft report" : report.status.toLowerCase() + " report"}</h3>
        <p className="text-sm text-slate-600">{date.format(report.periodStart)} – {date.format(report.periodEnd)} · Prepared by {report.createdBy.email}</p>
        {report.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{report.notes}</p>}
        {reportTable(rows)}
        {rows.length !== report._count.items && <p className="mt-3 text-sm text-amber-900">Some included records are no longer eligible and are excluded from these totals.</p>}
        <dl className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
          {[["Included funds received", income], ["Included money out", spent], ["Net of included records", income - spent]].map(([label, value]) => <div key={label}><dt className="text-sm">{label}</dt><dd className="font-bold">{money.format(Number(value))}</dd></div>)}
        </dl>
        {canEdit && report.status === "DRAFT" && editForm(report)}
      </article>;
    })}
    {canEdit && <details><summary className="cursor-pointer font-bold text-emerald-800">New liquidation draft</summary>{editForm()}</details>}
    {!canEdit && !reports.length && <p className="text-sm text-slate-600">No report has been prepared yet.</p>}
  </section>;
}
