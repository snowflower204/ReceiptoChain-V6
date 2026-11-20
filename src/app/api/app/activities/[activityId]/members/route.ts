import { NextRequest, NextResponse } from "next/server";
import { appendAuditEntry } from "@/lib/audit";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const EVENT_ROLES = ["FINANCE_REVIEWER", "ORGANIZER", "STAFF", "VOLUNTEER", "VIEWER"] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ activityId: string }> }
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });
  const activityId = Number((await params).activityId);
  const access = await getEventAccess(session.userId, activityId);
  if (!access?.isAdmin) return NextResponse.json({ message: "Only an administrator can manage the activity team." }, { status: 403 });

  const members = await prisma.businessMember.findMany({
    where: { businessId: access.event.businessId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          eventAssignments: { where: { eventId: activityId }, select: { role: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    members: members.map((member) => ({
      userId: member.userId,
      email: member.user.email,
      businessRole: member.role,
      eventRole: member.user.eventAssignments[0]?.role ?? null,
    })),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ activityId: string }> }
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });
  const activityId = Number((await params).activityId);
  const access = await getEventAccess(session.userId, activityId);
  if (!access?.isAdmin) return NextResponse.json({ message: "Only an administrator can manage the activity team." }, { status: 403 });

  const body = await request.json();
  const userId = Number(body.userId);
  const role = String(body.role ?? "");
  if (!Number.isInteger(userId) || !EVENT_ROLES.includes(role as (typeof EVENT_ROLES)[number])) {
    return NextResponse.json({ message: "Choose a valid member and activity role." }, { status: 400 });
  }

  const membership = await prisma.businessMember.findUnique({
    where: { userId_businessId: { userId, businessId: access.event.businessId } },
    include: { user: { select: { email: true } } },
  });
  if (!membership) return NextResponse.json({ message: "This user is not a member of the business." }, { status: 404 });

  const assignment = await prisma.$transaction(async (transaction) => {
    const saved = await transaction.businessEventMember.upsert({
      where: { eventId_userId: { eventId: activityId, userId } },
      create: { businessId: access.event.businessId, eventId: activityId, userId, assignedById: session.userId, role: role as (typeof EVENT_ROLES)[number] },
      update: { assignedById: session.userId, role: role as (typeof EVENT_ROLES)[number] },
      select: { userId: true, role: true },
    });
    await appendAuditEntry(transaction, {
      businessId: access.event.businessId,
      actorId: session.userId,
      action: "BUSINESS_EVENT_MEMBER_ASSIGNED",
      entityType: "BusinessEventMember",
      entityId: `${activityId}:${userId}`,
      summary: `Assigned ${membership.user.email} as ${role.toLowerCase().replaceAll("_", " ")}`,
      metadata: { eventId: activityId, userId, role },
    });
    return saved;
  });

  return NextResponse.json({ assignment });
}
