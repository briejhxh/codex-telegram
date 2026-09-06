import { publicError } from "../security/errors.js";
import type { AccountManager } from "../accounts/manager.js";
import type { TelegramService } from "../telegram/service.js";
import type { Policy } from "../security/policy.js";
import { budgetResponse, maxResponseBytes } from "./responseBudget.js";

export type ToolResult = { content: Array<{ type: "text"; text: string; annotations?: { audience?: ("user" | "assistant")[] } }>; structuredContent?: Record<string, unknown>; isError?: boolean };

export function json(data: unknown): ToolResult {
  let bounded = budgetResponse(data);
  let text = JSON.stringify(bounded, null, 2);
  // Successful MCP results carry both forms. Re-budget the single logical value
  // until their combined serialized payload remains within the configured cap.
  if (bounded && typeof bounded === "object" && !Array.isArray(bounded) && Buffer.byteLength(text, "utf8") + Buffer.byteLength(JSON.stringify(bounded), "utf8") > maxResponseBytes()) {
    bounded = budgetResponse(data, Math.floor(maxResponseBytes() / 4));
    text = JSON.stringify(bounded, null, 2);
  }
  // The exact same bounded value is used for both representations. The response
  // budget is deliberately applied before either representation is produced.
  return bounded && typeof bounded === "object" && !Array.isArray(bounded)
    ? { structuredContent: bounded as Record<string, unknown>, content: [{ type: "text", text, annotations: { audience: ["user"] } }] }
    : { content: [{ type: "text", text, annotations: { audience: ["user"] } }] };
}

export async function safely(action: string, work: () => Promise<unknown>): Promise<ToolResult> {
  try { return json(await work()); }
  catch (error) { return { isError: true, content: [{ type: "text", text: JSON.stringify({ action, error: publicError(error) }), annotations: { audience: ["user"] } }] }; }
}

export type ToolContext = { accounts: AccountManager; telegram: TelegramService; policy: Policy };
export async function withAccount<T>(context: ToolContext, account: string | undefined, work: (runtime: ReturnType<AccountManager["get"]>) => Promise<T>): Promise<T> { return work(context.accounts.get(account)); }
