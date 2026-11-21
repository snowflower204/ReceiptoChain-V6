import { NextRequest, NextResponse } from "next/server";
import { appendAuditEntry } from "@/lib/audit";
import { getCurrentSession } from "@/lib/auth";
import { getBusinessAdminAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string; invitationId: string }> }
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });

  const { businessId: rawBusinessId, invitationId: rawInvitationId } = await params;
  const businessId = parseId(rawBusinessId);
  const invitationId = parseId(rawInvitationId);
  if (!businessId || !invitationId) return NextResponse.json({ message: "Invalid invitation." }, { status: 400 });

  const access = await getBusinessAdminAccess(session.userId, businessId);
  if (!access) return NextResponse.json({ message: "Only a business administrator can revoke invitations." }, { status: 403 });

  const invitation = await prisma.businessInvitation.findFirst({
    where: { id: invitationId, businessId },
    select: { id: true, active: true, usedCount: true, maxUses: true },
  });
  if (!invitation) return NextResponse.json({ message: "Invitation not found." }, { status: 404 });

  if (!invitation.active) return NextResponse.json({ message: "Invitation is already inactive." }, { status: 409 });

  await prisma.$transaction(async (transaction) => {
    await transaction.businessInvitation.update({
      where: { id: invitation.id },
      data: { active: false },
    });

    await appendAuditEntry(transaction, {
      businessId,
      actorId: session.userId,
      action: "BUSINESS_INVITATION_REVOKED",
      entityType: "BusinessInvitation",
      entityId: String(invitation.id),
      summary: "Revoked a staff invitation",
      metadata: { usedCount: invitation.usedCount, maxUses: invitation.maxUses },
    });
  });

  return NextResponse.json({ success: true });
}
