"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Member = { userId: number; email: string; businessRole: string; eventRole: string | null };
const roles = ["FINANCE_REVIEWER", "ORGANIZER", "STAFF", "VOLUNTEER", "VIEWER"];
const label = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function TeamManager({ activityId, members }: { activityId: number; members: Member[] }) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("ORGANIZER");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function assign() {
    setSaving(true);
    const response = await fetch(`/api/app/activities/${activityId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    const data = await response.json();
    setMessage(response.ok ? "Team assignment saved." : data.message ?? "Assignment failed.");
    setSaving(false);
    if (response.ok) router.refresh();
  }

  async function remove(memberId: number) {
    setSaving(true);
    const response = await fetch(`/api/app/activities/${activityId}/members/${memberId}`, { method: "DELETE" });
    setSaving(false);
    if (response.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-2xl bg-emerald-50 p-4 sm:grid-cols-[1fr_1fr_auto]">
        <select value={userId} onChange={(event) => setUserId(event.target.value)} className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm">
          <option value="">Choose a business member</option>
          {members.map((member) => <option key={member.userId} value={member.userId}>{member.email}</option>)}
        </select>
        <select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm">
          {roles.map((item) => <option key={item} value={item}>{label(item)}</option>)}
        </select>
        <button type="button" onClick={assign} disabled={!userId || saving} className="rounded-full bg-emerald-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Assign</button>
      </div>
      {message && <p className="text-sm font-semibold text-slate-600">{message}</p>}
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
        {members.map((member) => (
          <div key={member.userId} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
            <div><p className="font-bold text-slate-900">{member.email}</p><p className="text-xs text-slate-500">Business role: {label(member.businessRole)}</p></div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{member.eventRole ? label(member.eventRole) : "Not assigned"}</span>
              {member.eventRole && <button type="button" onClick={() => remove(member.userId)} disabled={saving} className="text-xs font-bold text-red-700 hover:underline">Remove</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
