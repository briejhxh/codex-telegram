import type { TelegramService } from "../telegram/service.js";

export type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

export function json(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export async function safely(action: string, work: () => Promise<unknown>): Promise<ToolResult> {
  try { return json(await work()); }
  catch (error) { return { isError: true, content: [{ type: "text", text: JSON.stringify({ error: `${action}: ${error instanceof Error ? error.message : "unknown Telegram error"}` }) }] }; }
}

export type ToolContext = { telegram: TelegramService };
