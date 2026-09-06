import assert from "node:assert/strict";
import test from "node:test";
import { ApprovalError, consumeApproval, createApproval } from "../src/security/approval.js";

const secret = "test-secret";
const payload = { tool: "telegram_delete_own_message", account: "personal", chatId: 42, material: { message_id: 9 } };

test("accepts an approval only for its exact action payload", () => {
  const now = 1_000_000;
  const token = createApproval(secret, { ...payload, expiresAt: now + 60_000 });
  assert.doesNotThrow(() => consumeApproval(secret, payload, token, now));
});

test("rejects a token bound to another message or account", () => {
  const now = 2_000_000;
  const token = createApproval(secret, { ...payload, expiresAt: now + 60_000 });
  assert.throws(() => consumeApproval(secret, { ...payload, material: { message_id: 10 } }, token, now), (error: unknown) => error instanceof ApprovalError && error.code === "INVALID_APPROVAL");
  assert.throws(() => consumeApproval(secret, { ...payload, account: "work" }, token, now), (error: unknown) => error instanceof ApprovalError && error.code === "INVALID_APPROVAL");
});

test("rejects replay, expiry, and malformed approval tokens", () => {
  const now = 3_000_000;
  const reusable = createApproval(secret, { ...payload, expiresAt: now + 60_000 });
  consumeApproval(secret, payload, reusable, now);
  assert.throws(() => consumeApproval(secret, payload, reusable, now), (error: unknown) => error instanceof ApprovalError && error.code === "INVALID_APPROVAL");
  const expired = createApproval(secret, { ...payload, expiresAt: now - 1 });
  assert.throws(() => consumeApproval(secret, payload, expired, now), (error: unknown) => error instanceof ApprovalError && error.code === "INVALID_APPROVAL");
  assert.throws(() => consumeApproval(secret, payload, `${reusable}.extra`, now), (error: unknown) => error instanceof ApprovalError && error.code === "INVALID_APPROVAL");
});

test("atomically consumes an approval token at most once under concurrent attempts", async () => {
  const now = 4_000_000;
  const token = createApproval(secret, { ...payload, expiresAt: now + 60_000 });
  const attempts = await Promise.allSettled([0, 1].map(async () => consumeApproval(secret, payload, token, now)));
  assert.equal(attempts.filter((attempt) => attempt.status === "fulfilled").length, 1);
  assert.equal(attempts.filter((attempt) => attempt.status === "rejected").length, 1);
});
