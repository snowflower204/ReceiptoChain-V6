import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentID } = body;

    if (!studentID) {
      return NextResponse.json(
        { message: "Student ID is required" },
        { status: 400 }
      );
    }

    const qrCode = await QRCode.toDataURL(String(studentID));

    return NextResponse.json(
      { qrCode },
      { status: 200 }
    );
  } catch (error) {
    console.error("QR code generation error:", error);

    return NextResponse.json(
      { message: "Error generating QR code" },
      { status: 500 }
    );
  }
}