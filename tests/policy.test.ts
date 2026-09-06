import assert from "node:assert/strict";
import test from "node:test";
import { Policy, PolicyError } from "../src/security/policy.js";
import { WriteRateLimiter, RateLimitError } from "../src/security/rateLimit.js";
import { createApproval } from "../src/security/approval.js";

const policyKeys = ["TG_POLICY_PROFILE", "TG_ALLOWED_CHAT_IDS", "TG_DENIED_CHAT_IDS", "TG_ALLOWED_TOOLS", "TG_DENIED_TOOLS", "TG_FILE_ROOTS", "TG_MAX_SEND_FILE_BYTES", "TG_DESTRUCTIVE_APPROVAL", "TG_DESTRUCTIVE_APPROVAL_SECRET", "TG_ACCOUNT"] as const;

function withEnvironment(values: Partial<Record<typeof policyKeys[number], string>>, work: () => void) {
  const previous = new Map(policyKeys.map((key) => [key, process.env[key]]));
  try {
    for (const key of policyKeys) {
      const value = values[key];
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    work();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}

test("policy denies writes by default", () => withEnvironment({}, () => {
  assert.throws(() => new Policy().authorize("telegram_send_message", "write", { chatId: 1 }), (error: unknown) => error instanceof PolicyError && error.code === "WRITE_DISABLED");
}));

test("policy enforces peer allow and deny lists", () => withEnvironment({ TG_POLICY_PROFILE: "messaging", TG_ALLOWED_CHAT_IDS: "7", TG_DENIED_CHAT_IDS: "9" }, () => {
  const policy = new Policy();
  assert.doesNotThrow(() => policy.authorize("telegram_send_message", "write", { chatId: 7 }));
  assert.throws(() => policy.authorize("telegram_send_message", "write", { chatId: 8 }), (error: unknown) => error instanceof PolicyError && error.code === "PEER_NOT_ALLOWED");
  assert.throws(() => policy.authorize("telegram_send_message", "write", { chatId: 9 }), (error: unknown) => error instanceof PolicyError && error.code === "PEER_DENIED");
}));

test("destructive operations require an exact one-time approval token", () => withEnvironment({ TG_POLICY_PROFILE: "admin", TG_DESTRUCTIVE_APPROVAL_SECRET: "not-from-telegram", TG_ACCOUNT: "personal" }, () => {
  const policy = new Policy();
  assert.throws(() => policy.authorize("telegram_delete_own_message", "destructive", { chatId: 1 }), (error: unknown) => error instanceof PolicyError && error.code === "APPROVAL_REQUIRED");
  const token = createApproval("not-from-telegram", { tool: "telegram_delete_own_message", account: "personal", chatId: 1, material: { message_id: 7 }, expiresAt: Date.now() + 60_000 });
  assert.doesNotThrow(() => policy.authorize("telegram_delete_own_message", "destructive", { chatId: 1, approvalCode: token, material: { message_id: 7 } }));
  assert.throws(() => policy.authorize("telegram_delete_own_message", "destructive", { chatId: 1, approvalCode: token, material: { message_id: 7 } }), (error: unknown) => error instanceof PolicyError && error.code === "INVALID_APPROVAL");
}));

test("write limiter bounds repeated operations and reports a retry time", () => {
  let now = 1_000;
  const limiter = new WriteRateLimiter(2, 60_000, () => now);
  limiter.consume("chat:1");
  limiter.consume("chat:1");
  assert.throws(() => limiter.consume("chat:1"), (error: unknown) => error instanceof RateLimitError && error.retryAfterSeconds === 60);
  now += 60_001;
  assert.doesNotThrow(() => limiter.consume("chat:1"));
});
