import { createHash, randomBytes } from "node:crypto";

const INVITATION_CODE_PATTERN = /^RC([A-F0-9]{18})$/;

/**
 * Converts copied invitation codes to the single format stored by ReceiptoChain.
 *
 * Users can receive codes through chat, email, or a wrapped browser view. Those
 * tools sometimes insert whitespace or replace a regular hyphen with a Unicode
 * dash. Removing separators before rebuilding the known RC code format makes
 * those visually identical copies validate consistently.
 */
export function normalizeInvitationCode(code: string): string {
  const compact = code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const match = compact.match(INVITATION_CODE_PATTERN);

  if (!match) {
    return code.trim().toUpperCase();
  }

  const token = match[1];
  return `RC-${token.slice(0, 6)}-${token.slice(6, 12)}-${token.slice(12, 18)}`;
}

export function isInvitationCodeFormatValid(code: string): boolean {
  return /^RC-[A-F0-9]{6}-[A-F0-9]{6}-[A-F0-9]{6}$/.test(
    normalizeInvitationCode(code)
  );
}

export function createInviteHash(code: string): string {
  return createHash("sha256")
    .update(normalizeInvitationCode(code))
    .digest("hex");
}

export function generateInvitationCode(): string {
  const token = randomBytes(9).toString("hex").toUpperCase();
  return `RC-${token.slice(0, 6)}-${token.slice(6, 12)}-${token.slice(12, 18)}`;
}
