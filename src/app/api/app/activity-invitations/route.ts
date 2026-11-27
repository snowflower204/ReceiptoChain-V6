import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { generateActivityInvitationCode } from "@/lib/activity-invitations";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const hash = (code: string) => createHash("sha256").update(code).digest("hex");
const reply = (message: string, status: number) => NextResponse.json({ message }, { status });

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return reply("Please sign in.", 401);
  if (request.headers.get("origin") !== request.nextUrl.origin) return reply("Invalid request origin.", 403);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return reply("Invalid request.", 400);

  const redeem = body.action === "redeem";
  if (!redeem && !["open", "close", "issue"].includes(body.action)) return reply("Invalid action.", 400);
  const code = typeof body.code === "string" && body.code.length <= 60 ? body.code.trim().toUpperCase() : "";
  if (redeem && !/^[A-Z0-9]{1,24}(?:-[2-9A-HJKMNP-Z]{6}){3}$/.test(code)) return reply("Enter a valid activity code.", 400);
  if (!redeem && (!Number.isSafeInteger(body.activityId) || body.activityId < 1 || body.activityId > 2147483647)) return reply("Invalid activity.", 400);

  return prisma.$transaction(async (tx) => {
    const lookup = redeem ? await tx.activityInvitation.findUnique({ where: { codeHash: hash(code) } }) : null;
    if (redeem && !lookup) return reply("This activity code is unavailable.", 409);
    const eventId: number = lookup?.eventId ?? body.activityId;
    // Serialize redemption, issuing, and closing for the same activity.
    await tx.$queryRaw`SELECT id FROM business_events WHERE id = ${eventId} FOR UPDATE`;
    const event = await tx.businessEvent.findUnique({ where: { id: eventId } });
    if (!event) return reply("Activity not found.", 404);

    if (lookup) {
      if (event.status !== "ACTIVE") return reply("This activity code is unavailable.", 409);
      const existing = await tx.businessEventMember.findUnique({ where: { eventId_userId: { eventId, userId: session.userId } } });
      if (existing) return reply("You already belong to this activity.", 409);
      const claimed = await tx.activityInvitation.updateMany({ where: { id: lookup.id, redeemedAt: null, revokedAt: null }, data: { redeemedAt: new Date() } });
      if (claimed.count !== 1) return reply("This activity code is unavailable.", 409);
      await tx.businessEventMember.create({ data: { eventId, userId: session.userId, businessId: event.businessId, assignedById: lookup.issuedById, role: "STAFF" } });
      return NextResponse.json({ eventId });
    }

    const membership = await tx.businessMember.findUnique({ where: { userId_businessId: { userId: session.userId, businessId: event.businessId } } });
    if (membership?.role !== "OWNER") return reply("Only the business owner can manage activity invitations.", 403);
    if (body.action === "issue") {
      if (event.status !== "ACTIVE") return reply("Open the activity before issuing a code.", 409);
      const issued = generateActivityInvitationCode(event.name);
      await tx.activityInvitation.create({ data: { eventId, issuedById: session.userId, codeHash: hash(issued) } });
      return NextResponse.json({ code: issued }, { status: 201, headers: { "Cache-Control": "no-store" } });
    }

    const opening = body.action === "open";
    if (opening ? !["DRAFT", "PUBLISHED", "COMPLETED"].includes(event.status) : event.status !== "ACTIVE") {
      return reply("This activity cannot change to that status.", 409);
    }
    const status = opening ? "ACTIVE" : "COMPLETED";
    await tx.businessEvent.update({ where: { id: eventId }, data: { status } });
    if (!opening) await tx.activityInvitation.updateMany({ where: { eventId, redeemedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    return NextResponse.json({ status });
  });
}
