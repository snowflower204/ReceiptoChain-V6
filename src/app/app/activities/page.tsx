import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { isBusinessAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import ActivityInviteControls from "./ActivityInviteControls";

function readableRole(role: string) {
  return role.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function readableDate(value: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export default async function ActivitiesPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const adminBusinessIds = session.user.memberships
    .filter((membership) => isBusinessAdmin(membership.role))
    .map((membership) => membership.businessId);

  const activities = await prisma.businessEvent.findMany({
    where: {
      OR: [
        { businessId: { in: adminBusinessIds } },
        { members: { some: { userId: session.userId } } },
      ],
    },
    include: {
      business: true,
      members: {
        where: { userId: session.userId },
        select: { role: true },
      },
      _count: {
        select: {
          activities: true,
          liquidationReports: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { startsAt: "desc" }],
  });

  const canCreate = adminBusinessIds.length > 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-700 px-6 py-8 text-white shadow-xl sm:px-10">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-yellow-300">Your workspace</p>
            <h1 className="text-3xl font-bold sm:text-4xl">Choose an activity to continue</h1>
            <p className="mt-3 text-emerald-50/90">
              Money records, receipts, reconciliation, and liquidation reports stay grouped under the activity where they belong.
            </p>
          </div>
          {canCreate && (
            <Link href="/app/activities/new" className="inline-flex min-h-12 items-center justify-center rounded-full bg-yellow-300 px-6 py-3 font-bold text-emerald-950 transition hover:bg-yellow-200">
              Create an activity
            </Link>
          )}
        </div>
      </section>

      <ActivityInviteControls />

      <div className="mt-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Activities you can access</h2>
          <p className="mt-1 text-sm text-slate-600">Active and completed activities remain available for reference.</p>
        </div>
        <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">{activities.length} total</span>
      </div>

      {activities.length === 0 ? (
        <section className="mt-6 rounded-3xl border border-dashed border-emerald-300 bg-white p-10 text-center">
          <p className="text-lg font-bold text-slate-900">No activity is assigned to you yet</p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
            An administrator can create an activity and add you as an organizer, finance reviewer, staff member, or volunteer.
          </p>
        </section>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {activities.map((activity) => {
            const membership = session.user.memberships.find((item) => item.businessId === activity.businessId);
            const role = isBusinessAdmin(membership?.role ?? "")
              ? membership?.role ?? "ADMIN"
              : activity.members[0]?.role ?? "VIEWER";

            return (
              <Link key={activity.id} href={`/app/activities/${activity.id}`} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{activity.status}</span>
                  <span className="text-xs font-semibold text-slate-500">{readableRole(role)}</span>
                </div>
                <h3 className="mt-5 text-xl font-bold text-slate-950 group-hover:text-emerald-800">{activity.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{activity.business.name}</p>
                <p className="mt-4 line-clamp-2 min-h-10 text-sm text-slate-600">{activity.description || "No description has been added yet."}</p>
                <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Starts</p>
                    <p className="font-semibold text-slate-800">{readableDate(activity.startsAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Finance records</p>
                    <p className="font-semibold text-slate-800">{activity._count.activities}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
