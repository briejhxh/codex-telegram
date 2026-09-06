import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";

export function registerSendMessage(server: McpServer, { telegram, policy }: ToolContext) {
  server.registerTool("telegram_send_message", { description: "Send text through the personal Telegram account. This requires a server-side write policy and explicit confirmation of recipient and exact message.", inputSchema: { chat_id: z.number().int(), text: z.string().min(1).max(4096) }, annotations: { readOnlyHint: false, destructiveHint: false } }, async ({ chat_id, text }) => safely("telegram_send_message", async () => { policy.authorize("telegram_send_message", "write", { chatId: chat_id }); return telegram.displayMessage(await telegram.sendMessage(chat_id, text)); }));
}
