import assert from "node:assert/strict";
import test from "node:test";
import { json } from "../src/tools/common.js";

test("structured content and compatibility text share exactly one bounded logical result", () => {
  const result = json({ items: [{ message_id: 1, text: "😀".repeat(20_000) }], has_more: false, truncated: false });
  assert.ok(result.structuredContent);
  assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
  const text = (result.structuredContent?.items as Array<Record<string, unknown>>)[0].text as string;
  assert.ok(text.length <= 8_192);
});
