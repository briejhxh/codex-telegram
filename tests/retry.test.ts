import assert from "node:assert/strict";
import test from "node:test";
import { TelegramError, telegramError } from "../src/telegram/errors.js";
import { executeWithRetry, operationPolicies, requestPolicy } from "../src/telegram/retry.js";

test("maps TDLib errors to stable public-safe codes", () => {
  assert.equal(telegramError(new Error("FLOOD_WAIT_12")).code, "TELEGRAM_FLOOD_WAIT");
  assert.equal(telegramError(new Error("Can't lock file td.binlog because it is already in use")).code, "SESSION_LOCKED");
  assert.equal(telegramError(new Error("authorization state waitPhoneNumber")).code, "AUTH_REQUIRED");
  assert.equal(telegramError(new Error("message not found")).code, "MESSAGE_NOT_FOUND");
  assert.equal(telegramError(new Error("network connection lost")).code, "NETWORK_ERROR");
});

test("classifies write and read requests with different retry policies", () => {
  assert.equal(requestPolicy("getChat").kind, "metadata");
  assert.equal(requestPolicy("getChatHistory").kind, "history");
  assert.equal(requestPolicy("searchMessages").kind, "search");
  assert.equal(requestPolicy("sendMessage").kind, "write");
  assert.equal(requestPolicy("downloadFile").kind, "transfer");
});

test("retries a retryable read with bounded backoff", async () => {
  let calls = 0;
  const delays: number[] = [];
  const value = await executeWithRetry(async () => {
    calls += 1;
    if (calls < 3) throw new Error("network connection lost");
    return "ok";
  }, { policy: operationPolicies.metadata, random: () => 0, sleep: async (delay) => { delays.push(delay); } });
  assert.equal(value, "ok");
  assert.equal(calls, 3);
  assert.deepEqual(delays, [250, 500]);
});

test("does not replay writes after a transient failure", async () => {
  let calls = 0;
  await assert.rejects(() => executeWithRetry(async () => { calls += 1; throw new Error("network connection lost"); }, { policy: operationPolicies.write }), (error: unknown) => error instanceof TelegramError && error.code === "WRITE_OUTCOME_UNKNOWN");
  assert.equal(calls, 1);
});

test("does not retry a FloodWait beyond the configured retry ceiling", async () => {
  const delays: number[] = [];
  await assert.rejects(() => executeWithRetry(async () => { throw new Error("FLOOD_WAIT_12"); }, { policy: { ...operationPolicies.metadata, retries: 1, maxDelayMs: 1_000 }, random: () => 0, sleep: async (delay) => { delays.push(delay); } }), (error: unknown) => error instanceof TelegramError && error.code === "TELEGRAM_FLOOD_WAIT");
  assert.deepEqual(delays, []);
});

test("returns cancellation without retrying", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => executeWithRetry(async () => "no", { policy: operationPolicies.metadata, signal: controller.signal }), (error: unknown) => error instanceof TelegramError && error.code === "CANCELLED");
});

test("cancellation during retry backoff prevents the next attempt", async () => {
  const controller = new AbortController(); let calls = 0;
  await assert.rejects(() => executeWithRetry(async () => { calls += 1; throw new Error("network connection lost"); }, { policy: operationPolicies.metadata, signal: controller.signal, sleep: async () => { controller.abort(); throw new TelegramError("CANCELLED", "The operation was cancelled."); } }), (error: unknown) => error instanceof TelegramError && error.code === "CANCELLED");
  assert.equal(calls, 1);
});

test("turns a write timeout into an uncertain-outcome error", async () => {
  await assert.rejects(() => executeWithRetry(() => new Promise<string>(() => undefined), { policy: { ...operationPolicies.write, timeoutMs: 1 } }), (error: unknown) => error instanceof TelegramError && error.code === "WRITE_OUTCOME_UNKNOWN");
});
