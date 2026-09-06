import assert from "node:assert/strict";
import test from "node:test";
import { cursorContext, decodeCursor, encodeCursor, page } from "../src/telegram/pagination.js";
import { TelegramError } from "../src/telegram/errors.js";

test("signed cursors are bound to account, tool, and normalized query context", () => {
  const expected = { account: "personal", operation: "telegram_search_messages", context: cursorContext({ query: "hello", chat_id: 7 }) };
  const cursor = encodeCursor({ ...expected, state: { offset: 3 } });
  assert.equal(decodeCursor(cursor, expected).state.offset, 3);
  assert.throws(() => decodeCursor(cursor, { ...expected, account: "work" }), (error: unknown) => error instanceof TelegramError && error.code === "INVALID_INPUT");
  assert.throws(() => decodeCursor(cursor, { ...expected, operation: "telegram_get_messages" }), (error: unknown) => error instanceof TelegramError && error.code === "INVALID_INPUT");
});

test("rejects malformed and oversized cursor payloads", () => {
  const expected = { account: "personal", operation: "telegram_search_messages", context: cursorContext({ query: "hello" }) };
  const cursor = encodeCursor({ ...expected, state: { offset: 3 } });
  assert.throws(() => decodeCursor(`${cursor}x`, expected), (error: unknown) => error instanceof TelegramError && error.code === "INVALID_INPUT");
  assert.throws(() => decodeCursor("not-base64-json", expected), (error: unknown) => error instanceof TelegramError && error.code === "INVALID_INPUT");
});

test("builds a bounded page without silently truncating results", () => {
  const result = page([3, 2, 1], 2, 0, (next) => `after-${next}`);
  assert.deepEqual(result, { items: [3, 2], next_cursor: "after-2", has_more: true, truncated: true });
  assert.deepEqual(page([1], 2, 0, String), { items: [1], next_cursor: undefined, has_more: false, truncated: false });
});
