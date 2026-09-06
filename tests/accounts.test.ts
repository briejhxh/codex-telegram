import assert from "node:assert/strict";
import test from "node:test";
import { AccountRegistry } from "../src/accounts/registry.js";
import { TelegramError } from "../src/telegram/errors.js";

test("account registry lazily isolates each configured account runtime", () => {
  let created = 0;
  const registry = new AccountRegistry((settings) => ({ id: ++created, directory: settings.databaseDirectory }), "default", ["default", "work"]);
  const first = registry.resolve();
  const repeat = registry.resolve("default");
  const work = registry.resolve("work");
  assert.equal(first.service, repeat.service);
  assert.notEqual(first.service, work.service);
  assert.notEqual(first.settings.databaseDirectory, work.settings.databaseDirectory);
  assert.throws(() => registry.resolve("missing"), (error: unknown) => error instanceof TelegramError && error.code === "ACCOUNT_NOT_FOUND");
});

test("account registry closes every materialized runtime exactly once", async () => {
  const closed: string[] = [];
  const registry = new AccountRegistry((settings) => ({ close: async () => { closed.push(settings.account); } }), "default", ["default", "work"]);
  registry.resolve(); registry.resolve("work");
  await registry.close();
  assert.deepEqual(closed.sort(), ["default", "work"]);
});
