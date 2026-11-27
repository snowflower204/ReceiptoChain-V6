"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PaymentEvidenceForm({ activityId }: { activityId: number }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return <form className="flex flex-wrap gap-2" onSubmit={async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/app/financial-activities/${activityId}/evidence`, {
        method: "POST", body: new FormData(event.currentTarget),
      });
      if (response.ok) router.refresh();
      else setMessage((await response.json()).message ?? "Could not submit proof.");
    } catch {
      setMessage("Could not submit proof. Please try again.");
    } finally {
      setBusy(false);
    }
  }}>
    <input type="file" name="file" aria-label="Payment evidence (PDF, PNG or JPEG up to 2 MB)" accept="application/pdf,image/png,image/jpeg" required />
    <button className="rounded bg-emerald-800 px-3 py-1 text-white" disabled={busy}>{busy ? "Submitting…" : "Submit proof of payment"}</button>
    {message && <p role="alert">{message}</p>}
  </form>;
}
