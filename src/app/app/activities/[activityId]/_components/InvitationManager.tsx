"use client";

import { useState } from "react";

type Invitation = {
  id: number;
  role: string;
  expiresAt: string | Date | null;
  maxUses: number;
  usedCount: number;
  active: boolean;
  createdAt: string | Date;
};

function invitationStatus(invitation: Invitation) {
  if (invitation.usedCount >= invitation.maxUses) return "Used";
  if (!invitation.active) return "Revoked";
  if (invitation.expiresAt && new Date(invitation.expiresAt).getTime() <= Date.now()) return "Expired";
  return "Active";
}

function readableDate(value: string | Date | null) {
  if (!value) return "No expiry";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function InvitationManager({ businessId, initialInvitations }: { businessId: number; initialInvitations: Invitation[] }) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [newCode, setNewCode] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function createInvitation() {
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/app/businesses/${businessId}/invitations`, { method: "POST" });
    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setMessage(data.message ?? "Could not create an invitation.");
      return;
    }

    setNewCode(data.code);
    setInvitations((current) => [data.invitation, ...current]);
    setMessage("Invitation created. Copy it now—the full code is shown only once.");
  }

  async function copyCode() {
    await navigator.clipboard.writeText(newCode);
    setMessage("Invitation code copied securely.");
  }

  async function revokeInvitation(invitationId: number) {
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/app/businesses/${businessId}/invitations/${invitationId}`, { method: "DELETE" });
    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setMessage(data.message ?? "Could not revoke the invitation.");
      return;
    }

    setInvitations((current) => current.map((item) => item.id === invitationId ? { ...item, active: false } : item));
    setMessage("Invitation revoked.");
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-bold text-slate-950">Invite a business member</h3>
            <p className="mt-1 text-sm text-slate-600">Creates a single-use Staff Member code that expires after seven days.</p>
          </div>
          <button type="button" onClick={createInvitation} disabled={saving} className="rounded-full bg-yellow-400 px-5 py-3 text-sm font-bold text-emerald-950 hover:bg-yellow-300 disabled:opacity-50">
            {saving ? "Working…" : "Generate invitation"}
          </button>
        </div>

        {newCode && (
          <div className="mt-5 rounded-xl border border-yellow-300 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Copy this code now</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="flex-1 break-all rounded-lg bg-slate-950 px-4 py-3 text-base font-bold tracking-wider text-yellow-300">{newCode}</code>
              <button type="button" onClick={copyCode} className="rounded-full bg-emerald-900 px-5 py-3 text-sm font-bold text-white">Copy code</button>
            </div>
          </div>
        )}

        {message && <p className="mt-3 text-sm font-semibold text-slate-700">{message}</p>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        {invitations.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No invitations have been created yet.</p>
        ) : invitations.map((invitation) => {
          const status = invitationStatus(invitation);
          return (
            <div key={invitation.id} className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 last:border-b-0 sm:flex-row sm:items-center">
              <div>
                <p className="font-bold text-slate-900">Staff invitation #{invitation.id}</p>
                <p className="mt-1 text-xs text-slate-500">Expires {readableDate(invitation.expiresAt)} · {invitation.usedCount}/{invitation.maxUses} uses</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{status}</span>
                {status === "Active" && (
                  <button type="button" onClick={() => revokeInvitation(invitation.id)} disabled={saving} className="text-xs font-bold text-red-700 hover:underline disabled:opacity-50">Revoke</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
