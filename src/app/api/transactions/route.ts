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

function parseDate(dateText: string) {
  const date = new Date(
    dateText.length === 10
      ? `${dateText}T00:00:00.000Z`
      : dateText
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

// GET /api/transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const studentID = searchParams.get("studentID") || "All";
    const paymentMethod =
      searchParams.get("paymentMethod") || "All";

    const transactions = await prisma.transaction.findMany({
      where: {
        ...(studentID !== "All"
          ? {
              student: {
                idNumber: studentID,
              },
            }
          : {}),
        ...(paymentMethod !== "All"
          ? {
              paymentMethod,
            }
          : {}),
      },
      include: {
        student: true,
        transactionEvents: {
          include: {
            event: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    const formattedTransactions = transactions.map(
      (transaction) => {
        const totalAmount = Number(
          transaction.totalAmount.toString()
        );

        const eventsPaid = transaction.transactionEvents
          .map((item) => item.event.title)
          .sort((first, second) =>
            first.localeCompare(second)
          )
          .join(", ");

        return {
          transactionID: transaction.id,
          studentID: transaction.studentId,
          date: transaction.date.toISOString().split("T")[0],
          paymentMethod: transaction.paymentMethod,
          receiptNumber: transaction.receiptNumber,
          status: transaction.status,

          // Keep both names temporarily for frontend compatibility.
          totalAmount,
          total_amount: totalAmount,

          eventsPaid,

          IDnumber: transaction.student.idNumber,
          FirstName: transaction.student.firstName,
          LastName: transaction.student.lastName,
          Course: transaction.student.course,
          Year: transaction.student.year,

          firstName: transaction.student.firstName,
          lastName: transaction.student.lastName,
        };
      }
    );

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
    });
  } catch (error: unknown) {
    console.error("Error fetching transactions:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch transactions",
      },
      { status: 500 }
    );
  }
}

// POST /api/transactions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const studentID = String(body.studentID ?? "").trim();
    const paymentMethod = String(
      body.paymentMethod ?? ""
    ).trim();
    const dateText = String(body.date ?? "").trim();
    const receiptNumber = body.receiptNumber
      ? String(body.receiptNumber).trim()
      : null;
    const status = String(
      body.status ?? "pending"
    ).trim();

    if (
      !studentID ||
      !paymentMethod ||
      !dateText ||
      !Array.isArray(body.eventIDs) ||
      body.eventIDs.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields or events",
        },
        { status: 400 }
      );
    }

   const eventIDs: number[] = Array.from(
  new Set<number>(
    body.eventIDs.map((value: unknown) => Number(value))
  )
);

    const containsInvalidEventID = eventIDs.some(
      (eventID) =>
        !Number.isInteger(eventID) || eventID <= 0
    );

    if (containsInvalidEventID) {
      return NextResponse.json(
        {
          success: false,
          error: "One or more event IDs are invalid",
        },
        { status: 400 }
      );
    }

    const transactionDate = parseDate(dateText);

    if (!transactionDate) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid transaction date",
        },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: {
        idNumber: studentID,
      },
      select: {
        id: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: "Student not found",
        },
        { status: 404 }
      );
    }

    const events = await prisma.event.findMany({
      where: {
        id: {
          in: eventIDs,
        },
      },
      select: {
        id: true,
        amount: true,
      },
    });

    if (events.length !== eventIDs.length) {
      return NextResponse.json(
        {
          success: false,
          error: "One or more selected events do not exist",
        },
        { status: 400 }
      );
    }

    const totalCentavos = events.reduce(
      (total, event) =>
        total +
        Math.round(
          Number(event.amount.toString()) * 100
        ),
      0
    );

    const totalAmount = (totalCentavos / 100).toFixed(2);

    const transaction = await prisma.transaction.create({
      data: {
        studentId: student.id,
        paymentMethod,
        date: transactionDate,
        receiptNumber: receiptNumber || null,
        status: status || "pending",
        totalAmount,
        transactionEvents: {
  create: eventIDs.map((eventID) => ({
    event: {
      connect: {
        id: eventID,
      },
    },
  })),
},

      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Transaction created successfully.",
        transactionID: transaction.id,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (getErrorCode(error) === "P2002") {
      return NextResponse.json(
        {
          success: false,
          error: "Receipt number already exists",
        },
        { status: 409 }
      );
    }

    console.error("Error creating transaction:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to insert transaction",
      },
      { status: 500 }
    );
  }
}