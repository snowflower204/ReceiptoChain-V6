import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { EvidenceReviewButtons, EvidenceUploadForm } from "../_components/EvidenceActions";
import PaymentConfirmationForm from "../_components/PaymentActions";

export default async function PaymentsPage({ params }: { params: Promise<{ activityId: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const activityId = Number((await params).activityId);
  const access = await getEventAccess(session.userId, activityId);
  if (!access) notFound();
  const canUpload = access.isAdmin || access.eventRole !== "VIEWER";
  const canReview = access.isAdmin || access.eventRole === "FINANCE_REVIEWER";

  const records = await prisma.financialActivity.findMany({
    where: { eventId: activityId, status: { not: "VOIDED" } },
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          kind: true,
          status: true,
          fileName: true,
          sizeBytes: true,
          submittedById: true,
          submittedBy: { select: { email: true } },
          reviewedBy: { select: { email: true } },
          reviewNotes: true,
          createdAt: true,
        },
      },
      paymentConfirmation: { include: { confirmedBy: { select: { email: true } } } },
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
          const confirmation = record.paymentConfirmation;
          const hasAcceptedEvidence = record.documents.some((document) => document.status === "ACCEPTED");
          const mayConfirmThisRecord = canReview && record.createdById !== session.userId;
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
              {confirmation && <p className="mt-3 text-xs text-slate-500">Confirmed independently by {confirmation.confirmedBy.email} · {confirmation.method} · reference {confirmation.reference}</p>}
              {record.documents.length > 0 && (
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  {record.documents.map((document) => (
                    <div key={document.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <div>
                          <a href={`/api/app/evidence/${document.id}/file`} target="_blank" rel="noreferrer" className="font-bold text-emerald-800 hover:underline">{document.fileName}</a>
                          <p className="mt-1 text-xs text-slate-500">{document.kind.replaceAll("_", " ")} · {(document.sizeBytes / 1024).toFixed(0)} KB · submitted by {document.submittedBy?.email ?? "legacy record"}</p>
                          {document.reviewedBy && <p className="mt-1 text-xs text-slate-500">Reviewed by {document.reviewedBy.email}{document.reviewNotes ? ` · ${document.reviewNotes}` : ""}</p>}
                        </div>
                        <span className={`h-fit rounded-full px-3 py-1 text-xs font-bold ${document.status === "ACCEPTED" ? "bg-emerald-100 text-emerald-800" : document.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-900"}`}>{document.status}</span>
                      </div>
                      {canReview && document.status === "PENDING" && document.submittedById !== session.userId && <EvidenceReviewButtons documentId={document.id} />}
                      {canReview && document.status === "PENDING" && document.submittedById === session.userId && <p className="mt-2 text-xs font-semibold text-slate-500">A different administrator or finance reviewer must review this file.</p>}
                    </div>
                  ))}
                </div>
              )}
              {canUpload && <EvidenceUploadForm activityId={record.id} />}
              {!confirmation && mayConfirmThisRecord && hasAcceptedEvidence && <PaymentConfirmationForm activityId={record.id} />}
              {!confirmation && canReview && !hasAcceptedEvidence && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">Payment confirmation unlocks after a different reviewer accepts at least one evidence file.</p>}
              {!confirmation && canReview && record.createdById === session.userId && hasAcceptedEvidence && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">A different administrator or finance reviewer must confirm this money record.</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
