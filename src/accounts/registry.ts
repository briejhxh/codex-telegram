import { activeAccount, accountSettings, configuredAccountNames, type AccountSettings } from "../config.js";
import { TelegramError } from "../telegram/errors.js";

export type AccountRuntime<T> = { account: string; settings: AccountSettings; service: T };

/** Lazily creates one fully isolated service instance per configured account. */
export class AccountRegistry<T> {
  private readonly runtimes = new Map<string, AccountRuntime<T>>();
  private readonly accounts: Set<string>;
  constructor(private readonly create: (settings: AccountSettings) => T, private readonly defaultAccount = activeAccount, names = configuredAccountNames()) { this.accounts = new Set(names); }
  list() { return [...this.accounts]; }
  resolve(account?: string): AccountRuntime<T> {
    const name = account ?? this.defaultAccount;
    if (!this.accounts.has(name)) throw new TelegramError("ACCOUNT_NOT_FOUND", `Telegram account profile '${name}' is not configured for this server.`);
    let runtime = this.runtimes.get(name);
    if (!runtime) { runtime = { account: name, settings: accountSettings(name), service: this.create(accountSettings(name)) }; this.runtimes.set(name, runtime); }
    return runtime;
  }
  async close(): Promise<void> { await Promise.all([...this.runtimes.values()].map(async ({ service }) => { const closable = service as { close?: () => Promise<void> }; await closable.close?.(); })); this.runtimes.clear(); }
}
