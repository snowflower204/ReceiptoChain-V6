import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { isBusinessAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { appendAuditEntry } from "@/lib/audit";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

function dateFromInput(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ message: "Please sign in." }, { status: 401 });
  }

  const businesses = session.user.memberships
    .filter((membership) => isBusinessAdmin(membership.role))
    .map((membership) => ({
      id: membership.businessId,
      name: membership.business.name,
      currency: membership.business.defaultCurrency,
    }));

  return NextResponse.json({ businesses });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ message: "Please sign in." }, { status: 401 });
  }

  const body = await request.json();
  const businessId = Number(body.businessId);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const venue = typeof body.venue === "string" ? body.venue.trim() : "";
  const startsAt = dateFromInput(body.startsAt);
  const endsAt = body.endsAt ? dateFromInput(body.endsAt) : null;
  const budgetTotal = Number(body.budgetTotal ?? 0);

  const membership = session.user.memberships.find(
    (item) => item.businessId === businessId
  );

  if (!membership || !isBusinessAdmin(membership.role)) {
    return NextResponse.json(
      { message: "Only a business owner or administrator can create an activity." },
      { status: 403 }
    );
  }

  if (
    !name ||
    name.length > 120 ||
    !startsAt ||
    (endsAt && endsAt < startsAt) ||
    !Number.isFinite(budgetTotal) ||
    budgetTotal < 0
  ) {
    return NextResponse.json(
      { message: "Check the activity name, dates, and budget before continuing." },
      { status: 400 }
    );
  }

  const baseSlug = slugify(name) || "activity";
  let slug = baseSlug;
  let suffix = 2;

  while (
    await prisma.businessEvent.findUnique({
      where: { businessId_slug: { businessId, slug } },
      select: { id: true },
    })
  ) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const activity = await prisma.$transaction(async (transaction) => {
    const created = await transaction.businessEvent.create({
      data: {
        businessId,
        createdById: session.userId,
        name,
        slug,
        description: description || null,
        venue: venue || null,
        startsAt,
        endsAt,
        budgetTotal,
        currency: membership.business.defaultCurrency,
        status: "DRAFT",
      },
      select: { id: true, name: true, status: true, budgetTotal: true },
    });

    await appendAuditEntry(transaction, {
      businessId,
      actorId: session.userId,
      action: "BUSINESS_EVENT_CREATED",
      entityType: "BusinessEvent",
      entityId: String(created.id),
      summary: `Created activity: ${created.name}`,
      metadata: { status: created.status, budgetTotal: String(created.budgetTotal) },
    });

    return created;
  });

  return NextResponse.json({ activity }, { status: 201 });
}
