import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";

export function registerGetPinnedMessage(server: McpServer, { telegram }: ToolContext) {
  server.registerTool("telegram_get_pinned_message", { description: "Read the currently pinned message in a known Telegram chat. Returns text and metadata only.", inputSchema: { chat_id: z.number().int() }, annotations: { readOnlyHint: true } }, async ({ chat_id }) => safely("telegram_get_pinned_message", async () => telegram.displayMessage(await telegram.pinnedMessage(chat_id))));
}
