import assert from "node:assert/strict";
import test from "node:test";
import { decodeMessageCursor, encodeMessageCursor, paginated } from "../src/telegram/pagination.js";
import { TelegramError } from "../src/telegram/errors.js";

test("encodes and decodes an opaque chat-bound message cursor", () => {
  const cursor = encodeMessageCursor({ v: 1, kind: "messages", chatId: 7, beforeMessageId: 99 });
  assert.deepEqual(decodeMessageCursor(cursor, 7), { v: 1, kind: "messages", chatId: 7, beforeMessageId: 99 });
  assert.throws(() => decodeMessageCursor(cursor, 8), (error: unknown) => error instanceof TelegramError && error.code === "INVALID_INPUT");
});

test("rejects malformed and oversized cursor payloads", () => {
  assert.throws(() => decodeMessageCursor("not-base64-json", 7), (error: unknown) => error instanceof TelegramError && error.code === "INVALID_INPUT");
  const malformed = Buffer.from(JSON.stringify({ v: 1, kind: "messages", chatId: 7, beforeMessageId: 0 })).toString("base64url");
  assert.throws(() => decodeMessageCursor(malformed, 7), (error: unknown) => error instanceof TelegramError && error.code === "INVALID_INPUT");
});

test("builds a bounded page without silently truncating results", () => {
  const result = paginated([3, 2, 1], 2, (last) => `after-${last}`);
  assert.deepEqual(result, { items: [3, 2], next_cursor: "after-2", has_more: true, truncated: true });
  assert.deepEqual(paginated([1], 2, String), { items: [1], next_cursor: undefined, has_more: false, truncated: false });
});
