import { prisma } from "@/lib/prisma";

export const ADMIN_ROLES = ["OWNER", "ADMIN"] as const;

export function isBusinessAdmin(role: string): boolean {
  return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}

export async function getEventAccess(userId: number, eventId: number) {
  const event = await prisma.businessEvent.findUnique({
    where: { id: eventId },
    include: {
      business: {
        include: {
          memberships: {
            where: { userId },
            select: { role: true },
          },
        },
      },
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!event) return null;

  const businessRole = event.business.memberships[0]?.role ?? null;
  const eventRole = event.members[0]?.role ?? null;
  const isAdmin = businessRole ? isBusinessAdmin(businessRole) : false;

  if (!isAdmin && !eventRole) return null;

  return { event, businessRole, eventRole, isAdmin };
}
