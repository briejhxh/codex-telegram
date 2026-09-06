import { AsyncLocalStorage } from "node:async_hooks";
import type { Policy } from "../security/policy.js";
import type { TelegramService } from "../telegram/service.js";
import type { AccountManager } from "./manager.js";

/** A request-local account selector; no client or policy is shared across profiles. */
export class AccountRouter {
  private readonly selected = new AsyncLocalStorage<string | undefined>();
  constructor(private readonly accounts: AccountManager) {}
  run<T>(account: string | undefined, work: () => Promise<T>) { return this.selected.run(account, work); }
  private runtime() { return this.accounts.get(this.selected.getStore()); }
  readonly telegram = new Proxy({} as TelegramService, { get: (_target, property) => {
    const value = this.runtime().service.telegram[property as keyof TelegramService];
    return typeof value === "function" ? value.bind(this.runtime().service.telegram) : value;
  } });
  readonly policy = new Proxy({} as Policy, { get: (_target, property) => {
    const value = this.runtime().service.policy[property as keyof Policy];
    return typeof value === "function" ? value.bind(this.runtime().service.policy) : value;
  } });
}
