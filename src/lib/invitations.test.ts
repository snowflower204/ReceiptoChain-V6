import assert from "node:assert/strict";
import test from "node:test";
import {
  createInviteHash,
  generateInvitationCode,
  isInvitationCodeFormatValid,
  normalizeInvitationCode,
} from "./invitations";

const STANDARD_CODE = "RC-D2400D-4BBB85-C2CFF4";

test("keeps a standard invitation code unchanged", () => {
  assert.equal(normalizeInvitationCode(STANDARD_CODE), STANDARD_CODE);
});

test("normalizes lowercase, surrounding whitespace, and internal line breaks", () => {
  assert.equal(
    normalizeInvitationCode("  rc-d2400d-4bbb85-\r\nc2cff4  "),
    STANDARD_CODE
  );
});

test("normalizes spaces and Unicode dash characters", () => {
  assert.equal(
    normalizeInvitationCode("RC D2400D–4BBB85—C2CFF4"),
    STANDARD_CODE
  );
});

test("equivalent copied codes produce the same stored hash", () => {
  assert.equal(
    createInviteHash("rc d2400d 4bbb85 c2cff4"),
    createInviteHash(STANDARD_CODE)
  );
});

test("keeps hashes compatible with invitations already stored in the database", () => {
  assert.equal(
    createInviteHash(STANDARD_CODE),
    "cb2e716190540a080b999c04d09a6bf1252224c5b7e013748789d80de0cc112e"
  );
});

test("rejects malformed invitation code formats", () => {
  assert.equal(isInvitationCodeFormatValid(STANDARD_CODE), true);
  assert.equal(isInvitationCodeFormatValid("RC-TOO-SHORT"), false);
});

test("generates codes accepted by the validator", () => {
  assert.equal(isInvitationCodeFormatValid(generateInvitationCode()), true);
});
