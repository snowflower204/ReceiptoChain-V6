"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ActivityInviteControls({ activityId, status }: { activityId?: number; status?: string }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [issuedCode, setIssuedCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(action: "open" | "close" | "issue" | "redeem") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/app/activity-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, activityId, code: action === "redeem" ? input : undefined }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message ?? "Could not complete the request.");
      } else if (action === "redeem") {
        router.push(`/app/activities/${data.eventId}`);
        router.refresh();
      } else if (action === "issue") {
        setIssuedCode(data.code);
      } else {
        setIssuedCode("");
        router.refresh();
      }
    } catch {
      setMessage("Could not reach ReceiptoChain. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const open = status === "ACTIVE";
  const canOpen = status === "DRAFT" || status === "PUBLISHED" || status === "COMPLETED";
  const button = "rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50";
  return (
    <section className="mt-6 space-y-3 rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">{activityId === undefined ? "Join an activity" : "Activity invitations"}</h2>
      {activityId === undefined ? (
        <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void submit("redeem"); }}>
          <input aria-label="Activity invite code" value={input} maxLength={60} onChange={(event) => setInput(event.target.value)} placeholder="Enter activity code" className="rounded-lg border px-3 py-2" required />
          <button className={button} disabled={busy}>Join activity</button>
        </form>
      ) : (
        <>
          <p className="text-sm text-slate-600">One code per staff member. Unused codes stop working when you close the activity, even if you reopen it later.</p>
          <div className="flex flex-wrap gap-2">
            {(open || canOpen) && <button type="button" className={button} disabled={busy} onClick={() => {
              if (!open || window.confirm("Close this activity and invalidate its unused invitation codes?")) void submit(open ? "close" : "open");
            }}>{open ? "Close activity" : "Open activity"}</button>}
            {open && <button type="button" className={button} disabled={busy} onClick={() => void submit("issue")}>Generate staff code</button>}
          </div>
          {issuedCode && <p className="break-all"><strong>Copy this single-use code now: </strong><code>{issuedCode}</code></p>}
        </>
      )}
      {message && <p role="status" className="text-sm text-red-700">{message}</p>}
    </section>
  );
}
