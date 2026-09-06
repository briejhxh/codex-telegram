import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";

export function registerReplyMessage(server: McpServer, { telegram }: ToolContext) {
  server.registerTool("telegram_reply_message", { description: "Reply to a specific Telegram message. This changes external state: call only after user confirmation of recipient and text.", inputSchema: { chat_id: z.number().int(), reply_to_message_id: z.number().int().positive(), text: z.string().min(1).max(4096) }, annotations: { readOnlyHint: false, destructiveHint: false } }, async ({ chat_id, reply_to_message_id, text }) => safely("telegram_reply_message", async () => telegram.displayMessage(await telegram.sendMessage(chat_id, text, reply_to_message_id))));
}
