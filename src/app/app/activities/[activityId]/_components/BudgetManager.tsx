"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type BudgetItem = { id: number; name: string; category: string | null; plannedAmount: number; actualAmount: number };

export default function BudgetManager({ activityId, currency, items, canEdit, canDelete }: { activityId: number; currency: string; items: BudgetItem[]; canEdit: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const format = (value: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency }).format(value);

  async function add(formData: FormData) {
    const response = await fetch(`/api/app/activities/${activityId}/budget-items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(formData)) });
    const data = await response.json();
    setMessage(response.ok ? "Budget item added." : data.message ?? "Could not add the item.");
    if (response.ok) router.refresh();
  }

  async function update(itemId: number, formData: FormData) {
    const response = await fetch(`/api/app/activities/${activityId}/budget-items/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(formData)) });
    const data = await response.json();
    setMessage(response.ok ? "Budget item updated." : data.message ?? "Could not update the item.");
    if (response.ok) { setEditingId(null); router.refresh(); }
  }

  async function remove(itemId: number) {
    const response = await fetch(`/api/app/activities/${activityId}/budget-items/${itemId}`, { method: "DELETE" });
    const data = await response.json();
    setMessage(response.ok ? "Unused budget item removed." : data.message ?? "Could not remove the item.");
    if (response.ok) router.refresh();
  }

  return (
    <div className="space-y-5">
      {canEdit && <form action={add} className="grid gap-3 rounded-2xl bg-yellow-50 p-4 sm:grid-cols-[1fr_1fr_180px_auto]"><input name="name" required placeholder="Budget item" className="rounded-xl border border-yellow-200 bg-white px-4 py-3 text-sm"/><input name="category" placeholder="Category" className="rounded-xl border border-yellow-200 bg-white px-4 py-3 text-sm"/><input name="plannedAmount" required type="number" min="0" step="0.01" placeholder="Planned amount" className="rounded-xl border border-yellow-200 bg-white px-4 py-3 text-sm"/><button className="rounded-full bg-emerald-900 px-5 py-3 text-sm font-bold text-white">Add item</button></form>}
      {message && <p className="text-sm font-semibold text-slate-600">{message}</p>}
      <div className="space-y-3">
        {items.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No detailed budget items yet.</p>}
        {items.map((item) => editingId === item.id ? (
          <form key={item.id} action={(data) => update(item.id, data)} className="grid gap-3 rounded-2xl border border-emerald-300 p-4 sm:grid-cols-[1fr_1fr_180px_auto]"><input name="name" defaultValue={item.name} required className="rounded-xl border border-slate-300 px-3 py-2"/><input name="category" defaultValue={item.category ?? ""} className="rounded-xl border border-slate-300 px-3 py-2"/><input name="plannedAmount" type="number" min="0" step="0.01" defaultValue={item.plannedAmount} required className="rounded-xl border border-slate-300 px-3 py-2"/><div className="flex gap-2"><button className="text-sm font-bold text-emerald-800">Save</button><button type="button" onClick={() => setEditingId(null)} className="text-sm font-bold text-slate-500">Cancel</button></div></form>
        ) : (
          <div key={item.id} className="grid gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-[1fr_160px_160px_auto] sm:items-center"><div><p className="font-bold">{item.name}</p><p className="text-xs text-slate-500">{item.category || "Uncategorized"}</p></div><div><p className="text-xs text-slate-500">Planned</p><p className="font-bold">{format(item.plannedAmount)}</p></div><div><p className="text-xs text-slate-500">Actual</p><p className="font-bold">{format(item.actualAmount)}</p></div><div className="flex gap-3">{canEdit && <button type="button" onClick={() => setEditingId(item.id)} className="text-xs font-bold text-emerald-800">Edit</button>}{canDelete && <button type="button" onClick={() => remove(item.id)} className="text-xs font-bold text-red-700">Remove</button>}</div></div>
        ))}
      </div>
    </div>
  );
}
