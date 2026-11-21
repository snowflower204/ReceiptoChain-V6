import { createHash, randomBytes } from "node:crypto";

export function createInviteHash(code: string): string {
  return createHash("sha256")
    .update(code.trim().toUpperCase())
    .digest("hex");
}

export function generateInvitationCode(): string {
  const token = randomBytes(9).toString("hex").toUpperCase();
  return `RC-${token.slice(0, 6)}-${token.slice(6, 12)}-${token.slice(12, 18)}`;
}
