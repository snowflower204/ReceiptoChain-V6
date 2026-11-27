import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type SignupType =
  | "CUSTOMER"
  | "BUSINESS_OWNER"
  | "BUSINESS_MEMBER";

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function createBusinessSlug(name: string): string {
  const base =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "business";

  return `${base}-${randomUUID().slice(0, 8)}`;
}

function getErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return undefined;
}

function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    password.length <= 72 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9\s]/.test(password)
  );
}

export async function POST(request: NextRequest) {
  try {
    const rawBody: unknown = await request.json();

    if (
      !rawBody ||
      typeof rawBody !== "object" ||
      Array.isArray(rawBody)
    ) {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 }
      );
    }

    const body = rawBody as Record<string, unknown>;

    const accountType = readString(
      body.accountType
    ).toUpperCase() as SignupType;

    const email = readString(body.email).toLowerCase();

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    const allowedAccountTypes: SignupType[] = [
      "CUSTOMER",
      "BUSINESS_OWNER",
      "BUSINESS_MEMBER",
    ];

    if (!allowedAccountTypes.includes(accountType)) {
      return NextResponse.json(
        { message: "Invalid account type" },
        { status: 400 }
      );
    }

    if (
      !email.includes("@") ||
      email.length < 5 ||
      email.length > 254
    ) {
      return NextResponse.json(
        { message: "Enter a valid email address" },
        { status: 400 }
      );
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json(
        {
          message:
            "Password must have 8 to 72 characters, including uppercase, lowercase, number, and special character.",
        },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          message:
            "An account with this email already exists",
        },
        { status: 409 }
      );
    }

    // The 12 below is the bcrypt security cost.
    const passwordHash = await bcrypt.hash(password, 12);

    // Creating a staff account grants no business or activity access.
    if (accountType !== "BUSINESS_OWNER") {
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          platformRole: true,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message:
            accountType === "BUSINESS_MEMBER"
              ? "Staff account created. Sign in to join an activity with your code."
              : "Customer account created successfully",
          account: user,
        },
        { status: 201 }
      );
    }

    // Business-owner registration
    {
      const businessName = readString(body.businessName);
      const legalName = readString(body.legalName);

      const countryCode =
        readString(body.countryCode).toUpperCase() || "PH";

      const defaultCurrency =
        readString(body.defaultCurrency).toUpperCase() ||
        "PHP";

      const timezone =
        readString(body.timezone) || "Asia/Manila";

      if (
        businessName.length < 2 ||
        businessName.length > 120
      ) {
        return NextResponse.json(
          { message: "Enter a valid business name" },
          { status: 400 }
        );
      }

      if (!/^[A-Z]{2}$/.test(countryCode)) {
        return NextResponse.json(
          {
            message:
              "Country code must contain two letters",
          },
          { status: 400 }
        );
      }

      if (!/^[A-Z]{3}$/.test(defaultCurrency)) {
        return NextResponse.json(
          {
            message:
              "Currency code must contain three letters",
          },
          { status: 400 }
        );
      }

      const result = await prisma.$transaction(
        async (tx) => {
          const user = await tx.user.create({
            data: {
              email,
              passwordHash,
            },
            select: {
              id: true,
              email: true,
              platformRole: true,
            },
          });

          const business = await tx.business.create({
            data: {
              name: businessName,
              slug: createBusinessSlug(businessName),
              legalName: legalName || null,
              countryCode,
              defaultCurrency,
              timezone,
              memberships: {
                create: {
                  role: "OWNER",
                  user: {
                    connect: {
                      id: user.id,
                    },
                  },
                },
              },
            },
            select: {
              id: true,
              name: true,
              slug: true,
              countryCode: true,
              defaultCurrency: true,
            },
          });

          return {
            user,
            business,
          };
        }
      );

      return NextResponse.json(
        {
          success: true,
          message:
            "Business account created successfully",
          account: result.user,
          business: result.business,
        },
        { status: 201 }
      );
    }


  } catch (error: unknown) {
    console.error("Signup error:", error);


    if (getErrorCode(error) === "P2002") {
      return NextResponse.json(
        {
          message:
            "An account or business with these details already exists",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message: "Failed to create account",
      },
      { status: 500 }
    );
  }
}
