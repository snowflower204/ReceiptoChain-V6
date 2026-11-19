import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  revokeSession,
  SESSION_COOKIE,
} from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  await revokeSession(cookieStore.get(SESSION_COOKIE)?.value);

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
