import { NextRequest, NextResponse } from "next/server";
import { appendAuditEntry } from "@/lib/audit";
import { getCurrentSession } from "@/lib/auth";
import { createInviteHash, generateInvitationCode } from "@/lib/invitations";
import { getBusinessAdminAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const INVITATION_LIFETIME_DAYS = 7;

function parseBusinessId(value: string): number | null {
  const businessId = Number(value);
  return Number.isInteger(businessId) && businessId > 0 ? businessId : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });

  const businessId = parseBusinessId((await params).businessId);
  if (!businessId) return NextResponse.json({ message: "Invalid business." }, { status: 400 });

  const access = await getBusinessAdminAccess(session.userId, businessId);
  if (!access) return NextResponse.json({ message: "Only a business administrator can manage invitations." }, { status: 403 });

  const invitations = await prisma.businessInvitation.findMany({
    where: { businessId },
    select: {
      id: true,
      role: true,
      expiresAt: true,
      maxUses: true,
      usedCount: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ invitations });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });

  const businessId = parseBusinessId((await params).businessId);
  if (!businessId) return NextResponse.json({ message: "Invalid business." }, { status: 400 });

  const access = await getBusinessAdminAccess(session.userId, businessId);
  if (!access) return NextResponse.json({ message: "Only a business administrator can create invitations." }, { status: 403 });

  const code = generateInvitationCode();
  const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await prisma.$transaction(async (transaction) => {
    const created = await transaction.businessInvitation.create({
      data: {
        businessId,
        codeHash: createInviteHash(code),
        role: "STAFF",
        expiresAt,
        maxUses: 1,
      },
      select: {
        id: true,
        role: true,
        expiresAt: true,
        maxUses: true,
        usedCount: true,
        active: true,
        createdAt: true,
      },
    });

    await appendAuditEntry(transaction, {
      businessId,
      actorId: session.userId,
      action: "BUSINESS_INVITATION_CREATED",
      entityType: "BusinessInvitation",
      entityId: String(created.id),
      summary: "Created a single-use staff invitation",
      metadata: { role: created.role, expiresAt: created.expiresAt?.toISOString() ?? null, maxUses: created.maxUses },
    });

    return created;
  });

  return NextResponse.json({ invitation, code }, { status: 201 });
}
