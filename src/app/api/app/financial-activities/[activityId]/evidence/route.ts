import { createHash, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { appendAuditEntry } from "@/lib/audit";
import { getCurrentSession } from "@/lib/auth";
import { getEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const DOCUMENT_KINDS = [
  "PAYMENT_EVIDENCE",
  "INVOICE",
  "OFFICIAL_RECEIPT",
  "SALES_INVOICE",
  "EXPENSE_RECEIPT",
  "REIMBURSEMENT_EVIDENCE",
  "OTHER",
] as const;
type DocumentKind = (typeof DOCUMENT_KINDS)[number];
const MAX_FILE_SIZE = 2 * 1024 * 1024;

function hasExpectedSignature(mimeType: string, bytes: Buffer) {
  if (mimeType === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mimeType === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return false;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> }
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });

  const activityId = Number((await params).activityId);
  const activity = await prisma.financialActivity.findUnique({
    where: { id: activityId },
    select: { id: true, eventId: true, businessId: true, title: true, status: true },
  });
  if (!activity) return NextResponse.json({ message: "Money record not found." }, { status: 404 });

  const access = await getEventAccess(session.userId, activity.eventId);
  if (!access) return NextResponse.json({ message: "Money record not found." }, { status: 404 });
  if (!access.isAdmin && access.eventRole === "VIEWER") {
    return NextResponse.json({ message: "Your role cannot submit evidence." }, { status: 403 });
  }
  if (activity.status === "VOIDED") {
    return NextResponse.json({ message: "Evidence cannot be added to a removed record." }, { status: 409 });
  }

  const formData = await request.formData();
  const fileValue = formData.get("file");
  const kind = String(formData.get("kind") ?? "PAYMENT_EVIDENCE");
  const receiptReference = String(formData.get("receiptReference") ?? "").trim();
  if (receiptReference.length > 120) return NextResponse.json({ message: "Receipt reference must be at most 120 characters." }, { status: 400 });
  if (!(fileValue instanceof File) || !(DOCUMENT_KINDS as readonly string[]).includes(kind)) {
    return NextResponse.json({ message: "Choose a valid evidence file and document type." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(fileValue.type) || fileValue.size <= 0 || fileValue.size > MAX_FILE_SIZE) {
    return NextResponse.json({ message: "Use a PDF, PNG, or JPEG file no larger than 2 MB." }, { status: 400 });
  }

  const fileName = fileValue.name.replace(/[\r\n]/g, " ").trim().slice(0, 180) || "evidence";
  const bytes = Buffer.from(await fileValue.arrayBuffer());
  if (!hasExpectedSignature(fileValue.type, bytes)) {
    return NextResponse.json({ message: "The file contents do not match the selected PDF or image format." }, { status: 400 });
  }
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const storageKey = `postgres:${randomUUID()}`;

  const document = await prisma.$transaction(async (transaction) => {
    const created = await transaction.evidenceDocument.create({
      data: {
        businessId: activity.businessId,
        activityId,
        submittedById: session.userId,
        kind: kind as DocumentKind,
        receiptReference: receiptReference || null,
        status: "PENDING",
        fileName,
        storageKey,
        mimeType: fileValue.type,
        sizeBytes: bytes.byteLength,
        sha256,
        fileData: bytes,
      },
      select: { id: true, fileName: true, status: true, kind: true },
    });

    await appendAuditEntry(transaction, {
      businessId: activity.businessId,
      actorId: session.userId,
      action: "EVIDENCE_DOCUMENT_SUBMITTED",
      entityType: "EvidenceDocument",
      entityId: String(created.id),
      summary: `Submitted evidence for money record: ${activity.title}`,
      metadata: { activityId, fileName, kind, sizeBytes: bytes.byteLength, sha256 },
    });
    return created;
  });

  return NextResponse.json({ document }, { status: 201 });
}
