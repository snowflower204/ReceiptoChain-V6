import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function formatEvent(event: {
  id: number;
  title: string;
  amount: { toString(): string };
  semester: string;
  date: Date;
  description: string | null;
}) {
  return {
    eventID: event.id,
    title: event.title,
    amount: Number(event.amount.toString()),
    semester: event.semester,
    date: event.date.toISOString().split("T")[0],
    description: event.description ?? "",
  };
}

// GET /api/events
export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: {
        date: "desc",
      },
    });

    if (events.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No events found.",
        data: [],
        count: 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: events.map(formatEvent),
      count: events.length,
    });
  } catch (error: unknown) {
    console.error("Error fetching events:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch events",
      },
      { status: 500 }
    );
  }
}

// POST /api/events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const title = String(body.title ?? "").trim();
    const dateText = String(body.date ?? "").trim();
    const description = String(body.description ?? "").trim();
    const semester = String(body.semester ?? "").trim();
    const amount = Number(body.amount);

    if (
      !title ||
      !dateText ||
      !semester ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid required fields",
        },
        { status: 400 }
      );
    }

    const eventDate = new Date(
      dateText.length === 10
        ? `${dateText}T00:00:00.000Z`
        : dateText
    );

    if (Number.isNaN(eventDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid event date",
        },
        { status: 400 }
      );
    }

    const existingEvent = await prisma.event.findFirst({
      where: {
        title,
        semester,
      },
      select: {
        id: true,
      },
    });

    if (existingEvent) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Event with this title already exists for the semester",
        },
        { status: 409 }
      );
    }

    const event = await prisma.event.create({
      data: {
        title,
        date: eventDate,
        description: description || null,
        amount,
        semester,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Event created successfully",
        eventId: event.id,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating event:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create event",
      },
      { status: 500 }
    );
  }
}