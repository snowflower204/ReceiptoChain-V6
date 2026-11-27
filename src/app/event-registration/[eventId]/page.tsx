import Link from "next/link";
import { notFound } from "next/navigation";
import { registerForCustomerEvent } from "@/app/customer-actions";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function PublicEventRegistration({ params }: { params: Promise<{ eventId: string }> }) {
  const eventId = Number((await params).eventId);
  if (!Number.isSafeInteger(eventId) || eventId < 1 || eventId > 2147483647) notFound();
  const [event, session] = await Promise.all([
    prisma.businessEvent.findFirst({
      where: { id: eventId, customerFee: { not: null }, customerRegistrationClosedAt: null, status: { in: ["DRAFT", "PUBLISHED", "ACTIVE"] }, business: { status: "ACTIVE" } },
      select: { name: true, startsAt: true, venue: true, customerFee: true, customerPaymentInstructions: true, currency: true, business: { select: { name: true } } },
    }),
    getCurrentSession(),
  ]);
  if (!event?.customerFee) notFound();
  const next = `/event-registration/${eventId}`;
  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      <p>{event.business.name}</p>
      <h1 className="text-3xl font-bold">{event.name}</h1>
      <p>{event.startsAt.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })} · Philippine time</p>
      {event.venue && <p>{event.venue}</p>}
      <p className="text-xl font-semibold">{event.currency} {event.customerFee.toFixed(2)}</p>
      <h2 className="font-semibold">Payment instructions</h2>
      <p className="whitespace-pre-wrap">{event.customerPaymentInstructions}</p>
      <p>Register first, then submit proof of payment in My Events. The organizer confirms payments separately.</p>
      {session ? (
        <form action={registerForCustomerEvent.bind(null, eventId)}>
          <button className="rounded-lg bg-emerald-800 px-4 py-2 text-white">Register</button>
        </form>
      ) : <div className="flex gap-4">
        <Link className="underline" href={`/login?next=${next}`}>Sign in to register</Link>
        <Link className="underline" href={`/signup?next=${next}`}>Create an account</Link>
      </div>}
    </main>
  );
}
