import { NextRequest, NextResponse } from "next/server";
import { appendAuditEntry } from "@/lib/audit";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ activityId: string; userId: string }> }
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });
  const resolved = await params;
  const activityId = Number(resolved.activityId);
  const userId = Number(resolved.userId);
  const access = await getEventAccess(session.userId, activityId);
  if (!access?.isAdmin) return NextResponse.json({ message: "Only an administrator can manage the activity team." }, { status: 403 });

  const assignment = await prisma.businessEventMember.findUnique({
    where: { eventId_userId: { eventId: activityId, userId } },
    include: { user: { select: { email: true } } },
  });
  if (!assignment) return NextResponse.json({ message: "Assignment not found." }, { status: 404 });

  await prisma.$transaction(async (transaction) => {
    await transaction.businessEventMember.delete({ where: { eventId_userId: { eventId: activityId, userId } } });
    await appendAuditEntry(transaction, {
      businessId: access.event.businessId,
      actorId: session.userId,
      action: "BUSINESS_EVENT_MEMBER_REMOVED",
      entityType: "BusinessEventMember",
      entityId: `${activityId}:${userId}`,
      summary: `Removed ${assignment.user.email} from the activity team`,
      metadata: { eventId: activityId, userId, previousRole: assignment.role },
    });
  });

  return NextResponse.json({ success: true });
}
