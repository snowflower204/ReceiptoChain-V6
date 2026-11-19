"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { suffix: "", label: "Overview" },
  { suffix: "/money", label: "Money activities" },
  { suffix: "/payments", label: "Payments & receipts" },
  { suffix: "/reconciliation", label: "Reconciliation" },
  { suffix: "/liquidation", label: "Liquidation report" },
];

export default function ActivityNav({ activityId }: { activityId: number }) {
  const pathname = usePathname();
  const base = `/app/activities/${activityId}`;

  return (
    <nav aria-label="Activity sections" className="mt-6 flex gap-2 overflow-x-auto pb-2">
      {items.map((item) => {
        const href = `${base}${item.suffix}`;
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${
              active
                ? "bg-emerald-900 text-white"
                : "bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
