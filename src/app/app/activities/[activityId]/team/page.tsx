import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import InvitationManager from "../_components/InvitationManager";
import TeamManager from "../_components/TeamManager";
import ActivityInviteControls from "../../ActivityInviteControls";

export default async function ActivityTeamPage({ params }: { params: Promise<{ activityId: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const activityId = Number((await params).activityId);
  const access = await getEventAccess(session.userId, activityId);
  if (!access?.isAdmin) notFound();

  const memberships = await prisma.businessMember.findMany({
    where: { businessId: access.event.businessId },
    include: { user: { select: { email: true, eventAssignments: { where: { eventId: activityId }, select: { role: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  const members = memberships.map((membership) => ({ userId: membership.userId, email: membership.user.email, businessRole: membership.role, eventRole: membership.user.eventAssignments[0]?.role ?? null }));

  const invitations = await prisma.businessInvitation.findMany({
    where: { businessId: access.event.businessId },
    select: { id: true, role: true, expiresAt: true, maxUses: true, usedCount: true, active: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-5">
      {access.businessRole === "OWNER" && <ActivityInviteControls activityId={activityId} status={access.event.status} />}
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold">Business invitations</h2>
        <p className="mt-1 text-sm text-slate-600">Invite someone into the business before assigning them to this activity.</p>
        <div className="mt-6"><InvitationManager businessId={access.event.businessId} initialInvitations={invitations} /></div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold">Activity team</h2>
        <p className="mt-1 text-sm text-slate-600">Assign only the people who should see and work on this activity.</p>
        <div className="mt-6"><TeamManager activityId={activityId} members={members} /></div>
      </section>
    </div>
  );
}
