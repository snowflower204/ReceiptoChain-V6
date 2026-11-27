import { randomInt } from "node:crypto";

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const GROUP_LENGTH = 6;

/** The prefix is for display only; authorization must use the stored event ID. */
export function generateActivityInvitationCode(activityName: string): string {
  const prefix = activityName
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 24) || "ACTIVITY";

  const groups = Array.from({ length: 3 }, () =>
    Array.from({ length: GROUP_LENGTH }, () =>
      ALPHABET[randomInt(ALPHABET.length)],
    ).join(""),
  );

  return [prefix, ...groups].join("-");
}
