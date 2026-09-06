import assert from "node:assert/strict";
import test from "node:test";
import { doctorReport } from "../src/doctor.js";

test("doctor report is safe to share and never includes credential values", async () => {
  const report = await doctorReport();
  const text = JSON.stringify(report);
  assert.equal(report.tool, "codex-telegram doctor");
  assert.ok(Array.isArray(report.profiles));
  assert.equal(/api_hash|phone|password|approval|cursor_secret/i.test(text), false);
});
