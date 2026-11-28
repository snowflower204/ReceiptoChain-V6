"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type BudgetItem = { id: number; name: string; category: string | null; plannedAmount: number; quantity: number; notes: string | null };

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

  const groups = new Map<string, BudgetItem[]>();
  for (const item of items) {
    const label = item.category || "Uncategorized";
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }
  const field = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
  const fields = (item?: BudgetItem) => <>
    <label>Item<input name="name" required maxLength={120} defaultValue={item?.name} className={field + " block w-full"}/></label>
    <label>Category<input name="category" list="budget-categories" maxLength={80} defaultValue={item?.category ?? ""} placeholder="Choose or type a category" className={field + " block w-full"}/></label>
    <label>Amount per unit<input name="unitPrice" type="number" min="0" step="0.01" required defaultValue={item ? (item.plannedAmount / item.quantity).toFixed(2) : ""} className={field + " block w-full"}/></label>
    <label>Quantity<input name="quantity" type="number" min="1" max="1000000" step="1" required defaultValue={item?.quantity ?? 1} className={field + " block w-full"}/></label>
    <label>Note<input name="notes" maxLength={500} defaultValue={item?.notes ?? ""} className={field + " block w-full"}/></label>
  </>;

  return <div className="space-y-5">
    <div className="rounded-2xl bg-emerald-50 p-5">
      <p className="text-sm font-semibold text-emerald-900">Total planned expenses</p>
      <p className="text-3xl font-black text-emerald-950">{format(items.reduce((sum, item) => sum + item.plannedAmount, 0))}</p>
    </div>
    <datalist id="budget-categories">{[...groups.keys()].map((name) => <option key={name} value={name}/>)}</datalist>
    {canEdit && <form action={add} className="grid gap-3 rounded-2xl bg-yellow-50 p-4 sm:grid-cols-3">
      {fields()}<button className="self-end rounded-full bg-emerald-900 px-5 py-3 font-bold text-white">Add budget item</button>
    </form>}
    {message && <p role="status" className="text-sm font-semibold text-slate-600">{message}</p>}
    {items.length === 0 && <p className="text-sm text-slate-500">Add an item to create your first category card.</p>}
    {[...groups].map(([category, rows]) => <details key={category} className="rounded-2xl border border-emerald-100 bg-white">
      <summary className="cursor-pointer rounded-2xl bg-emerald-50 p-5 font-bold text-emerald-950">{category} · {format(rows.reduce((sum, row) => sum + row.plannedAmount, 0))} planned</summary>
      <div className="overflow-x-auto p-4"><table className="w-full text-left text-sm">
        <thead><tr>{["Item", "Amount per unit", "Quantity", "Subtotal", "Note", "Actions"].map((label) => <th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead>
        <tbody>{rows.map((item) => editingId === item.id ? <tr key={item.id}><td colSpan={6}><form action={(data) => update(item.id, data)} className="grid gap-3 p-3 sm:grid-cols-3">
          {fields()}<div className="flex gap-3"><button className="font-bold text-emerald-800">Save</button><button type="button" onClick={() => setEditingId(null)}>Cancel</button></div>
        </form></td></tr> : <tr key={item.id} className="border-t border-slate-100">
          <th scope="row" className="p-2">{item.name}</th><td className="p-2">{format(item.plannedAmount / item.quantity)}</td><td className="p-2">{item.quantity}</td><td className="p-2">{format(item.plannedAmount)}</td><td className="p-2">{item.notes || "—"}</td>
          <td className="p-2">{canEdit && <button type="button" onClick={() => setEditingId(item.id)} className="mr-3 font-bold text-emerald-800">Edit</button>}{canDelete && <button type="button" onClick={() => remove(item.id)} className="font-bold text-red-700">Remove</button>}</td>
        </tr>)}</tbody>
      </table></div>
    </details>)}
  </div>;
}
