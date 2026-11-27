"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function publishCustomerEvent(eventId: number, form: FormData) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const fee = String(form.get("fee") ?? "").trim();
  const instructions = String(form.get("instructions") ?? "").trim();
  const back = `/app/activities/${eventId}`;
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(fee) || Number(fee) <= 0 || !instructions || instructions.length > 1000) redirect(back + "?publish=invalid");
  const changed = await prisma.businessEvent.updateMany({
    where: {
      id: eventId,
      status: { in: ["DRAFT", "PUBLISHED", "ACTIVE"] },
      business: { memberships: { some: { userId: session.userId, role: "OWNER" } } },
    },
    data: { customerFee: fee, customerPaymentInstructions: instructions, customerRegistrationClosedAt: null },
  });
  if (!changed.count) notFound();
  revalidatePath(back);
  revalidatePath(`/event-registration/${eventId}`);
  redirect(back);
}

export async function closeCustomerRegistration(eventId: number) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const changed = await prisma.businessEvent.updateMany({
    where: { id: eventId, customerFee: { not: null }, business: { memberships: { some: { userId: session.userId, role: "OWNER" } } } },
    data: { customerRegistrationClosedAt: new Date() },
  });
  if (!changed.count) notFound();
  revalidatePath(`/event-registration/${eventId}`);
  redirect(`/app/activities/${eventId}`);
}

export async function registerForCustomerEvent(eventId: number) {
  const session = await getCurrentSession();
  const eventPath = `/event-registration/${eventId}`;
  if (!session) redirect(`/login?next=${eventPath}`);
  const available = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM business_events WHERE id = ${eventId} FOR UPDATE`;
    if (await tx.customerRegistration.findUnique({ where: { eventId_userId: { eventId, userId: session.userId } } })) return true;
    const event = await tx.businessEvent.findFirst({
      where: { id: eventId, customerFee: { not: null }, customerRegistrationClosedAt: null, status: { in: ["DRAFT", "PUBLISHED", "ACTIVE"] }, business: { status: "ACTIVE" } },
      select: { name: true, businessId: true, customerFee: true, currency: true },
    });
    if (!event?.customerFee) return false;
    const income = await tx.financialActivity.create({
      data: {
        eventId, businessId: event.businessId, createdById: session.userId,
        type: "INCOME", status: "SUBMITTED", title: "Event registration fee",
        amount: event.customerFee, currency: event.currency, occurredAt: new Date(),
      },
    });
    await tx.customerRegistration.create({
      data: { eventId, userId: session.userId, amount: event.customerFee, currency: event.currency, activityId: income.id },
    });
    return true;
  });
  if (!available) notFound();
  redirect("/app/my-events");
}
