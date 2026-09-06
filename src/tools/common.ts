import { publicError } from "../security/errors.js";
import type { AccountManager } from "../accounts/manager.js";
import type { TelegramService } from "../telegram/service.js";
import type { Policy } from "../security/policy.js";
import { budgetResponse } from "./responseBudget.js";

export type ToolResult = { content: Array<{ type: "text"; text: string; annotations?: { audience?: ("user" | "assistant")[] } }>; isError?: boolean };

export function json(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(budgetResponse(data), null, 2), annotations: { audience: ["user"] } }] };
}

export async function safely(action: string, work: () => Promise<unknown>): Promise<ToolResult> {
  try { return json(await work()); }
  catch (error) { return { isError: true, content: [{ type: "text", text: JSON.stringify({ action, error: publicError(error) }), annotations: { audience: ["user"] } }] }; }
}

export type ToolContext = { accounts: AccountManager; telegram: TelegramService; policy: Policy };
export async function withAccount<T>(context: ToolContext, account: string | undefined, work: (runtime: ReturnType<AccountManager["get"]>) => Promise<T>): Promise<T> { return work(context.accounts.get(account)); }
