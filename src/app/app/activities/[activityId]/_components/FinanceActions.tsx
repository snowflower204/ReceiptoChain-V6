"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RequestRemovalButton({ recordId }: { recordId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    const response = await fetch(`/api/app/financial-activities/${recordId}/removal-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = await response.json();
    setMessage(response.ok ? "Sent to the administrator for approval." : data.message ?? "Request failed.");
    setSaving(false);
    if (response.ok) {
      setReason("");
      router.refresh();
    }
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-red-300 hover:text-red-700">Request removal</button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <p className="font-bold text-slate-900">Why should this record be removed?</p>
          <p className="mt-1 text-xs text-slate-500">The record stays active until an administrator approves.</p>
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="mt-3 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="Explain the correction or duplicate…" />
          {message && <p className="mt-2 text-xs font-semibold text-slate-600">{message}</p>}
          <div className="mt-3 flex gap-2"><button type="button" onClick={submit} disabled={saving || reason.trim().length < 10} className="rounded-full bg-red-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">{saving ? "Sending…" : "Send request"}</button><button type="button" onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-xs font-bold text-slate-500">Cancel</button></div>
        </div>
      )}
    </div>
  );
}

export function ReviewRemovalButtons({ requestId }: { requestId: number }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function decide(decision: "APPROVED" | "REJECTED") {
    setSaving(true);
    const response = await fetch(`/api/app/removal-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    setSaving(false);
    if (response.ok) router.refresh();
  }

  return (
    <div className="mt-3 flex gap-2">
      <button type="button" onClick={() => decide("APPROVED")} disabled={saving} className="rounded-full bg-red-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Approve removal</button>
      <button type="button" onClick={() => decide("REJECTED")} disabled={saving} className="rounded-full border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">Keep record</button>
    </div>
  );
}

export function RestoreRecordButton({ recordId }: { recordId: number }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function restore() {
    setSaving(true);
    const response = await fetch(`/api/app/financial-activities/${recordId}/restore`, { method: "POST" });
    setSaving(false);
    if (response.ok) router.refresh();
  }

  return <button type="button" onClick={restore} disabled={saving} className="rounded-full border border-emerald-300 px-4 py-2 text-xs font-bold text-emerald-800 disabled:opacity-50">{saving ? "Restoring…" : "Restore record"}</button>;
}
