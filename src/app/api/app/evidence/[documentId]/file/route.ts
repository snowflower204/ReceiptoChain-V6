import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });

  const documentId = Number((await params).documentId);
  const document = await prisma.evidenceDocument.findUnique({
    where: { id: documentId },
    select: {
      fileName: true,
      mimeType: true,
      fileData: true,
      activity: { select: { eventId: true } },
      reimbursement: { select: { eventId: true } },
    },
  });
  if (!document?.fileData) return NextResponse.json({ message: "Evidence file not found." }, { status: 404 });

  const eventId = document.activity?.eventId ?? document.reimbursement?.eventId;
  if (!eventId || !(await getEventAccess(session.userId, eventId))) {
    return NextResponse.json({ message: "Evidence file not found." }, { status: 404 });
  }

  const safeName = document.fileName.replace(/[^a-zA-Z0-9._ -]/g, "_");
  return new NextResponse(new Uint8Array(document.fileData), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
