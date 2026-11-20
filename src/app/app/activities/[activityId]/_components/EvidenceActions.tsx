"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

export function EvidenceUploadForm({ activityId }: { activityId: number }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/app/financial-activities/${activityId}/evidence`, {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
    const data = await response.json();
    setSaving(false);
    setMessage(response.ok ? "Evidence submitted for review." : data.message ?? "Upload failed.");
    if (response.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-[180px_1fr_auto] md:items-end">
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-slate-600">Document type</span>
        <select name="kind" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="PAYMENT_EVIDENCE">Payment evidence</option>
          <option value="EXPENSE_RECEIPT">Expense receipt</option>
          <option value="OFFICIAL_RECEIPT">Official receipt</option>
          <option value="SALES_INVOICE">Sales invoice</option>
          <option value="INVOICE">Invoice</option>
          <option value="OTHER">Other</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-slate-600">PDF, PNG, or JPEG · up to 2 MB</span>
        <input name="file" type="file" accept="application/pdf,image/png,image/jpeg" required className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-xs file:font-bold file:text-emerald-900" />
      </label>
      <button disabled={saving} className="rounded-full bg-emerald-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Submitting…" : "Submit proof"}</button>
      {message && <p role="status" className="text-xs font-semibold text-slate-600 md:col-span-3">{message}</p>}
    </form>
  );
}

export function EvidenceReviewButtons({ documentId }: { documentId: number }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function review(decision: "ACCEPTED" | "REJECTED") {
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/app/evidence/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, reviewNotes: notes }),
    });
    const data = await response.json();
    setSaving(false);
    setMessage(response.ok ? `Evidence ${decision.toLowerCase()}. Payment remains unconfirmed.` : data.message ?? "Review failed.");
    if (response.ok) router.refresh();
  }

  return (
    <div className="mt-3 rounded-xl bg-yellow-50 p-3">
      <label className="block text-xs font-bold text-yellow-950">Review note <span className="font-normal">(required when rejecting)</span>
        <input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} className="mt-1 w-full rounded-lg border border-yellow-200 bg-white px-3 py-2 text-sm font-normal" placeholder="What did you verify or what needs correction?" />
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => review("ACCEPTED")} disabled={saving} className="rounded-full bg-emerald-800 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Accept document</button>
        <button type="button" onClick={() => review("REJECTED")} disabled={saving || notes.trim().length < 5} className="rounded-full border border-red-300 bg-white px-4 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Reject / request new proof</button>
      </div>
      {message && <p role="status" className="mt-2 text-xs font-semibold text-slate-600">{message}</p>}
    </div>
  );
}
