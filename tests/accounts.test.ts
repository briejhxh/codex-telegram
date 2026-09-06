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

test("a failed account initialization does not poison another account and can recover", () => {
  let failed = false; const created: string[] = [];
  const registry = new AccountRegistry((settings) => { created.push(settings.account); if (settings.account === "alpha" && !failed) { failed = true; throw new Error("initialization failed"); } return { account: settings.account }; }, "alpha", ["alpha", "beta"]);
  assert.throws(() => registry.resolve("alpha"), /initialization failed/);
  assert.equal(registry.resolve("beta").service.account, "beta");
  assert.equal(registry.resolve("alpha").service.account, "alpha");
  assert.deepEqual(created, ["alpha", "beta", "alpha"]);
});

test("shutdown closes all initialized accounts even when another account closes slowly", async () => {
  const closed: string[] = [];
  const registry = new AccountRegistry((settings) => ({ close: async () => { if (settings.account === "alpha") await new Promise((resolve) => setTimeout(resolve, 5)); closed.push(settings.account); } }), "alpha", ["alpha", "beta"]);
  registry.resolve("alpha"); registry.resolve("beta");
  await registry.close();
  assert.deepEqual(closed.sort(), ["alpha", "beta"]);
  assert.equal(registry.resolve("alpha").account, "alpha");
});
