import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import ActivityNav from "./_components/ActivityNav";
import { prisma } from "@/lib/prisma";

function readableRole(role: string) {
  return role.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function ActivityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ activityId: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const { activityId: rawActivityId } = await params;
  const activityId = Number(rawActivityId);
  if (!Number.isInteger(activityId) || activityId <= 0) notFound();

  const access = await getEventAccess(session.userId, activityId);
  if (!access) notFound();
  const cash = await prisma.financialActivity.findMany({
    where: { eventId: activityId, status: { in: ["CONFIRMED", "RECONCILED"] }, type: { in: ["INCOME", "EXPENSE", "REFUND", "REIMBURSEMENT"] } },
    select: { type: true, paymentConfirmation: { select: { amount: true } } },
  });
  const balance = cash.reduce((cents, record) => cents + (record.type === "INCOME" ? 1 : -1) *
    Math.round(Number(record.paymentConfirmation?.amount ?? 0) * 100), 0) / 100;

  const role = access.isAdmin
    ? access.businessRole ?? "ADMIN"
    : access.eventRole ?? "VIEWER";

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/app/activities" className="text-sm font-bold text-emerald-800 hover:underline">← Switch activity</Link>
      <section className="mt-4 rounded-[2rem] border border-emerald-100 bg-gradient-to-r from-white to-emerald-50 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-yellow-200 px-3 py-1 text-xs font-bold text-emerald-950">{access.event.status}</span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">{readableRole(role)}</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold text-slate-950">{access.event.name}</h1>
            <p className="mt-1 text-sm text-slate-600">{access.event.business.name}</p>
          </div>
          <div className="rounded-2xl bg-white px-5 py-3 text-sm shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Confirmed activity balance</p>
            <p className="mt-1 text-4xl font-black tabular-nums text-emerald-900">
              {new Intl.NumberFormat("en-PH", { style: "currency", currency: access.event.currency }).format(balance)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Confirmed money in minus money out</p>
          </div>
        </div>
      </section>
      <ActivityNav activityId={activityId} canManageTeam={access.isAdmin} />
      <div className="mt-5">{children}</div>
    </main>
  );
}
