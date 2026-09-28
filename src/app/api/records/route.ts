import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function formatStudent(student: {
  id: number;
  idNumber: string;
  firstName: string;
  lastName: string;
  course: string;
  year: string;
}) {
  return {
    studentID: student.id,
    IDnumber: student.idNumber,
    FirstName: student.firstName,
    LastName: student.lastName,
    Course: student.course,
    Year: student.year,
  };
}

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

// GET /api/records
export async function GET() {
  try {
    const students = await prisma.student.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      students: students.map(formatStudent),
    });
  } catch (error: unknown) {
    console.error("Error fetching students:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch students",
      },
      { status: 500 }
    );
  }
}

// POST /api/records
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const idNumber = String(
      body.IDnumber ?? body.idNumber ?? ""
    ).trim();

    const firstName = String(
      body.FirstName ?? body.firstName ?? ""
    ).trim();

    const lastName = String(
      body.LastName ?? body.lastName ?? ""
    ).trim();

    const course = String(
      body.Course ?? body.course ?? ""
    ).trim();

    const year = String(
      body.Year ?? body.year ?? ""
    ).trim();

    if (!idNumber || !firstName || !lastName || !course || !year) {
      return NextResponse.json(
        {
          success: false,
          message: "All student fields are required",
        },
        { status: 400 }
      );
    }

    const student = await prisma.student.create({
      data: {
        idNumber,
        firstName,
        lastName,
        course,
        year,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Student added successfully!",
        student: formatStudent(student),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (getErrorCode(error) === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message: "Student ID number already exists",
        },
        { status: 409 }
      );
    }

    console.error("Error inserting student:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to add student",
      },
      { status: 500 }
    );
  }
}