import { activeAccount, type AccountSettings } from "../config.js";
import { Policy } from "../security/policy.js";
import { TelegramClient } from "../telegram/client.js";
import type { TelegramService } from "../telegram/service.js";
import { AccountRegistry } from "./registry.js";

export type ManagedAccount = { telegram: TelegramService; policy: Policy };

export class AccountManager {
  private readonly registry = new AccountRegistry<ManagedAccount>((settings) => ({ telegram: new TelegramClient(settings), policy: new Policy(settings.environment, settings.account) }));
  get(account?: string) { return this.registry.resolve(account); }
  list() { return this.registry.list(); }
  async close() { await this.registry.close(); }
  get defaultAccount() { return activeAccount; }
}
