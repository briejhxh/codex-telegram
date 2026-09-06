import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import os from "node:os";
import { TelegramClient } from "../src/telegram/client.js";
import type { AccountSettings } from "../src/config.js";

const settings: AccountSettings = { account: "lifecycle", configDirectory: path.join(os.tmpdir(), "codex-telegram-test"), configFile: "", databaseDirectory: path.join(os.tmpdir(), "codex-telegram-test", "db"), filesDirectory: path.join(os.tmpdir(), "codex-telegram-test", "files"), downloadsDirectory: path.join(os.tmpdir(), "codex-telegram-test", "downloads"), environment: { TG_API_ID: "1", TG_API_HASH: "test" } };
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 5));
async function waitFor(predicate: () => boolean) { for (let attempt = 0; attempt < 50; attempt += 1) { if (predicate()) return; await tick(); } throw new Error("timed out waiting for test factory"); }

test("concurrent first use creates exactly one TDLib client and shares initialization", async () => {
  let factories = 0; let logins = 0; let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; });
  const client = new TelegramClient(settings, () => { factories += 1; return { on() {}, async login() { logins += 1; await gate; }, async invoke() { return { id: 1 }; }, async close() {} }; });
  const first = client.connect({}); const second = client.connect({}); await waitFor(() => factories === 1);
  assert.equal(factories, 1); assert.equal(logins, 1);
  release(); await Promise.all([first, second]);
  assert.deepEqual(await client.getMe(), { id: 1 }); await client.close();
});

test("failed shared initialization clears state and a later attempt recovers", async () => {
  let factories = 0;
  const client = new TelegramClient(settings, () => { factories += 1; return { on() {}, async login() { if (factories === 1) throw new Error("initial login failed"); }, async invoke() { return { id: 2 }; }, async close() {} }; });
  const attempts = await Promise.allSettled([client.connect({}), client.connect({})]);
  assert.equal(factories, 1); assert.ok(attempts.every((attempt) => attempt.status === "rejected"));
  await client.connect({}); assert.equal(factories, 2); assert.deepEqual(await client.getMe(), { id: 2 }); await client.close();
});
