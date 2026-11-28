import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { EvidenceUploadForm } from "../_components/EvidenceActions";

export default async function ReceiptsPage({ params }: { params: Promise<{ activityId: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const eventId = Number((await params).activityId);
  const access = await getEventAccess(session.userId, eventId);
  if (!access) notFound();
  const canUpload = access.isAdmin || access.eventRole !== "VIEWER";
  const records = await prisma.financialActivity.findMany({
    where: { eventId, status: { not: "VOIDED" } },
    select: { id: true, title: true, type: true, amount: true, description: true,
      budgetItem: { select: { category: true } },
      documents: { select: { id: true, fileName: true, receiptReference: true, status: true } } },
    orderBy: { occurredAt: "desc" },
  });
  const groups = new Map<string, typeof records>();
  for (const record of records) {
    const category = record.budgetItem?.category || "Uncategorized";
    groups.set(category, [...(groups.get(category) ?? []), record]);
  }
  const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: access.event.currency });
  return <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
    <h2 className="text-2xl font-bold">Receipts</h2>
    <p className="text-sm text-slate-600">Save proof on an existing money record. Uploading a receipt does not confirm a payment.</p>
    {!records.length && <p className="text-sm">Add a money activity first to attach proof.</p>}
    {[...groups].map(([category, rows]) => <details key={category} className="rounded-xl border border-emerald-100">
      <summary className="cursor-pointer bg-emerald-50 p-4 font-bold">{category} · {rows.reduce((sum, row) => sum + row.documents.length, 0)} proof files</summary>
      <div className="overflow-x-auto p-3"><table className="w-full text-left text-sm"><thead><tr>{["Item / Type", "Reference No.", "Amount", "Proof", "Note"].map((label) => <th scope="col" key={label} className="p-2">{label}</th>)}</tr></thead>
      <tbody>{rows.map((row) => <tr key={row.id} className="border-t align-top">
        <th scope="row" className="p-2">{row.title}<span className="block font-normal text-slate-500">{row.type.toLowerCase()}</span></th>
        <td className="p-2">{row.documents.map((doc) => doc.receiptReference).filter(Boolean).join(", ") || "—"}</td>
        <td className="p-2">{money.format(Number(row.amount))}</td>
        <td className="p-2">{row.documents.length === 0 && "No proof attached"}{row.documents.map((doc) => <div key={doc.id}><a className="font-semibold text-emerald-800 underline" href={`/api/app/evidence/${doc.id}/file`}>{doc.fileName}</a> · {doc.status.toLowerCase()}</div>)}
          {canUpload && <details className="mt-2"><summary className="cursor-pointer font-bold text-emerald-800">Save receipt</summary><EvidenceUploadForm activityId={row.id} receipt /></details>}</td>
        <td className="p-2">{row.description || "—"}</td>
      </tr>)}</tbody></table></div>
    </details>)}
  </section>;
}
