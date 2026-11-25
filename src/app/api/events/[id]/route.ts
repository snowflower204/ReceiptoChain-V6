import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error
  ) {
    return String(error.code);
  }

  return null;
}

function parseEventId(rawId: string) {
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function formatEvent(event: {
  id: number;
  title: string;
  date: Date;
  description: string | null;
  amount: { toString(): string };
  semester: string;
}) {
  return {
    eventID: event.id,
    title: event.title,
    date: event.date.toISOString().split("T")[0],
    description: event.description ?? "",
    amount: Number(event.amount.toString()),
    semester: event.semester,
  };
}

// GET /api/events/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseEventId(rawId);

  if (!id) {
    return NextResponse.json(
      { error: "Invalid event ID" },
      { status: 400 }
    );
  }

  try {
    const event = await prisma.event.findUnique({
      where: {
        id,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(formatEvent(event));
  } catch (error: unknown) {
    console.error("Error fetching event:", error);

    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}

// PUT /api/events/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseEventId(rawId);

  if (!id) {
    return NextResponse.json(
      { error: "Invalid event ID" },
      { status: 400 }
    );
  }

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
        { error: "Missing or invalid required fields" },
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
        { error: "Invalid event date" },
        { status: 400 }
      );
    }

    const duplicateEvent = await prisma.event.findFirst({
      where: {
        title,
        semester,
        NOT: {
          id,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicateEvent) {
      return NextResponse.json(
        {
          error:
            "Event with this title already exists for the semester",
        },
        { status: 409 }
      );
    }

    const event = await prisma.event.update({
      where: {
        id,
      },
      data: {
        title,
        date: eventDate,
        description: description || null,
        amount,
        semester,
      },
    });

    return NextResponse.json({
      message: "Event updated successfully",
      event: formatEvent(event),
    });
  } catch (error: unknown) {
    if (getErrorCode(error) === "P2025") {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    console.error("Error updating event:", error);

    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseEventId(rawId);

  if (!id) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid event ID",
      },
      { status: 400 }
    );
  }

  try {
    await prisma.event.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error: unknown) {
    const errorCode = getErrorCode(error);

    if (errorCode === "P2025") {
      return NextResponse.json(
        {
          success: false,
          error: "Event not found",
        },
        { status: 404 }
      );
    }

    if (errorCode === "P2003") {
      return NextResponse.json(
        {
          success: false,
          error:
            "This event cannot be deleted because it is used in a transaction.",
        },
        { status: 409 }
      );
    }

    console.error("Error deleting event:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete event",
      },
      { status: 500 }
    );
  }
}