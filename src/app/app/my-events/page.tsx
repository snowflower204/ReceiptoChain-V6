import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PaymentEvidenceForm from "./PaymentEvidenceForm";

export default async function MyEvents() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const registrations = await prisma.customerRegistration.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    select: {
      amount: true, currency: true,
      event: { select: { id: true, name: true, status: true, customerPaymentInstructions: true, customerRegistrationClosedAt: true, business: { select: { name: true, status: true } } } },
      activity: {
        select: {
          id: true, status: true,
          documents: { where: { kind: "PAYMENT_EVIDENCE" }, orderBy: { id: "desc" }, take: 1, select: { status: true } },
          paymentConfirmation: { select: { id: true } },
          receipt: { select: { receiptNumber: true, issuedAt: true, voidedAt: true } },
        },
      },
    },
  });
  return <main className="mx-auto max-w-3xl space-y-4 p-6">
    <h1 className="text-3xl font-bold">My Events</h1>
    {registrations.length === 0 && <p>No registrations yet. Open an event link from its organizer to register.</p>}
    {registrations.map(({ event, amount, currency, activity }) => {
      const closed = Boolean(event.customerRegistrationClosedAt) || !["DRAFT", "PUBLISHED", "ACTIVE"].includes(event.status) || event.business.status !== "ACTIVE";
      const confirmed = Boolean(activity?.paymentConfirmation) && activity?.status !== "VOIDED";
      const evidence = activity?.documents[0]?.status;
      const payable = activity && activity.status !== "VOIDED" && !confirmed && !closed;
      const receipt = confirmed && activity?.receipt && !activity.receipt.voidedAt ? activity.receipt : null;
      const receiptText = receipt ? [event.business.name, event.name, `Payment receipt: ${receipt.receiptNumber}`, `Amount: ${currency} ${amount.toFixed(2)}`, `Issued: ${receipt.issuedAt.toISOString()}`].join("\n") : "";
      return <article key={event.id} className="space-y-2 rounded-xl bg-white p-5 shadow-sm">
        <p>{event.business.name} · {closed ? "Closed" : "Open"}</p>
        <h2 className="text-xl font-semibold">{event.name}</h2>
        <p>{currency} {amount.toFixed(2)} · {activity?.status === "VOIDED" ? "Payment record removed" : confirmed ? "Payment confirmed" : evidence === "REJECTED" ? "Proof rejected" : evidence ? "Pending verification" : "Awaiting proof of payment"}</p>
        {payable && <p className="whitespace-pre-wrap">{event.customerPaymentInstructions}</p>}
        {payable && (!evidence || evidence === "REJECTED") && <PaymentEvidenceForm activityId={activity.id} />}
        {receipt && <a className="underline" href={`data:text/plain;charset=utf-8,${encodeURIComponent(receiptText)}`} download={`${receipt.receiptNumber}.txt`}>Download receipt {receipt.receiptNumber}</a>}
        {!closed && <Link className="block underline" href={`/event-registration/${event.id}`}>Event details</Link>}
      </article>;
    })}
  </main>;
}
