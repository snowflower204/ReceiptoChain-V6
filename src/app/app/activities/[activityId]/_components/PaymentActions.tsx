"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function PaymentConfirmationForm({ activityId }: { activityId: number }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(`/api/app/financial-activities/${activityId}/payment-confirmation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await response.json();
    setSaving(false);
    setMessage(response.ok ? "Payment confirmed independently." : data.message ?? "Confirmation failed.");
    if (response.ok) router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl bg-emerald-50 p-4 md:grid-cols-2">
      <p className="text-sm font-bold text-emerald-950 md:col-span-2">Confirm the real money movement</p>
      <p className="text-xs text-emerald-800 md:col-span-2">Check the bank, wallet, or cash record—not only the uploaded screenshot.</p>
      <label className="block"><span className="mb-1 block text-xs font-bold">Method</span><select name="method" required className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm"><option value="">Choose method</option><option>Bank transfer</option><option>GCash</option><option>Maya</option><option>Cash</option><option>Card</option><option>Other</option></select></label>
      <label className="block"><span className="mb-1 block text-xs font-bold">Provider <span className="font-normal">(optional)</span></span><input name="provider" maxLength={80} className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm" placeholder="Bank or wallet name" /></label>
      <label className="block md:col-span-2"><span className="mb-1 block text-xs font-bold">Transaction or cash reference</span><input name="reference" required minLength={3} maxLength={120} className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm" placeholder="Reference from the actual account, wallet, or cash log" /></label>
      <label className="block md:col-span-2"><span className="mb-1 block text-xs font-bold">Verification note <span className="font-normal">(optional)</span></span><input name="notes" maxLength={500} className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm" placeholder="What did you compare?" /></label>
      <div className="flex items-center gap-3 md:col-span-2"><button disabled={saving} className="rounded-full bg-emerald-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Confirming…" : "Confirm payment"}</button>{message && <p role="status" className="text-xs font-semibold text-slate-600">{message}</p>}</div>
    </form>
  );
}
