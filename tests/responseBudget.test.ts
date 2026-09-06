import assert from "node:assert/strict";
import test from "node:test";
import { budgetResponse } from "../src/tools/responseBudget.js";

test("response budget bounds giant Telegram strings without dropping identifiers", () => {
  const result = budgetResponse({ message_id: 7, chat_id: 9, text: "x".repeat(100_000) }) as Record<string, unknown>;
  assert.equal(result.message_id, 7); assert.equal(result.chat_id, 9); assert.equal(typeof result.text, "string"); assert.ok((result.text as string).length <= 8_192);
});
