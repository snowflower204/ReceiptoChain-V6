"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type BusinessOption = { id: number; name: string; currency: string };

export default function NewActivityPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/app/activities")
      .then((response) => response.json())
      .then((data) => setBusinesses(data.businesses ?? []))
      .catch(() => setMessage("We could not load your business workspace."));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);

    const response = await fetch("/api/app/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setMessage(data.message ?? "The activity could not be created.");
      return;
    }

    router.push(`/app/activities/${data.activity.id}`);
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <button type="button" onClick={() => router.back()} className="mb-5 text-sm font-semibold text-emerald-800 hover:underline">← Back to activities</button>
      <div className="rounded-[2rem] bg-white p-6 shadow-xl sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Admin setup</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Create an activity</h1>
        <p className="mt-2 text-slate-600">Start with the essentials. You can add the detailed budget and team members next.</p>

        <form onSubmit={submit} className="mt-8 space-y-6">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-800">Business workspace</span>
            <select name="businessId" required className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
              <option value="">Select a business</option>
              {businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
            </select>
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-800">Activity name</span>
              <input name="name" required maxLength={120} placeholder="Example: Campus DEVCON Iligan 2026" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-800">Short description</span>
              <textarea name="description" rows={3} placeholder="What is this activity for?" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-800">Start date</span>
              <input name="startsAt" type="date" required className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-800">End date <span className="font-normal text-slate-400">(optional)</span></span>
              <input name="endsAt" type="date" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-800">Venue <span className="font-normal text-slate-400">(optional)</span></span>
              <input name="venue" placeholder="Venue or online" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-800">Initial budget</span>
              <input name="budgetTotal" type="number" min="0" step="0.01" defaultValue="0" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            </label>
          </div>

          {message && <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{message}</p>}

          <div className="rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-950">
            <strong>What happens next?</strong> After creating the activity, you can add budget categories and assign organizers, finance reviewers, staff, and volunteers.
          </div>

          <button type="submit" disabled={saving || businesses.length === 0} className="w-full rounded-full bg-emerald-800 px-6 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "Creating activity…" : "Review and create activity"}
          </button>
        </form>
      </div>
    </main>
  );
}
