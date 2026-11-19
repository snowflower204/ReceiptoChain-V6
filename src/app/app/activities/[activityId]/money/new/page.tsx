"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function NewMoneyActivityPage() {
  const router = useRouter();
  const params = useParams<{ activityId: string }>();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));

    const response = await fetch(`/api/app/activities/${params.activityId}/financial-activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message ?? "The money record could not be saved.");
      setSaving(false);
      return;
    }

    router.push(`/app/activities/${params.activityId}/money`);
    router.refresh();
  }

  return (
    <section className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <button type="button" onClick={() => router.back()} className="text-sm font-bold text-emerald-800 hover:underline">← Back to money activities</button>
      <p className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">Step 1 of the finance workflow</p>
      <h2 className="mt-2 text-3xl font-bold">Record money in or money out</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Save the basic details first. Evidence review and payment confirmation happen separately afterward.</p>

      <form onSubmit={submit} className="mt-8 space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-bold">What kind of record is this?</span>
            <select name="type" required className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100">
              <option value="">Choose one</option><option value="INCOME">Money received</option><option value="EXPENSE">Money spent</option><option value="REFUND">Refund</option><option value="REIMBURSEMENT">Reimbursement</option><option value="ADJUSTMENT">Adjustment</option>
            </select>
          </label>
          <label className="block"><span className="mb-2 block text-sm font-bold">Date</span><input name="occurredAt" type="date" required className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></label>
          <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold">Short title</span><input name="title" required placeholder="Example: Registration payment from participant" className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></label>
          <label className="block"><span className="mb-2 block text-sm font-bold">Amount</span><input name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00" className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></label>
          <label className="block"><span className="mb-2 block text-sm font-bold">Person or organization</span><input name="counterparty" placeholder="Who paid or received it?" className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></label>
          <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold">Payment method <span className="font-normal text-slate-400">(optional)</span></span><input name="paymentMethod" placeholder="Cash, bank transfer, GCash, or another method" className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></label>
          <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold">Helpful notes <span className="font-normal text-slate-400">(optional)</span></span><textarea name="description" rows={3} placeholder="Add context that will help the reviewer understand." className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></label>
        </div>

        {message && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{message}</p>}
        <button disabled={saving} className="w-full rounded-full bg-emerald-900 px-6 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-50">{saving ? "Saving draft…" : "Save as draft"}</button>
      </form>
    </section>
  );
}
