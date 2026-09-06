import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";

export function registerManageMessage(server: McpServer, { telegram }: ToolContext) {
  server.registerTool("telegram_edit_own_message", { description: "Edit one text message previously sent by the authenticated Telegram account. This changes external state: require explicit confirmation of the chat, message, and replacement text.", inputSchema: { chat_id: z.number().int(), message_id: z.number().int().positive(), text: z.string().trim().min(1).max(4096) }, annotations: { readOnlyHint: false, destructiveHint: false } }, async ({ chat_id, message_id, text }) => safely("telegram_edit_own_message", async () => telegram.displayMessage(await telegram.editOwnMessage(chat_id, message_id, text))));
  server.registerTool("telegram_delete_own_message", { description: "Delete one message previously sent by the authenticated Telegram account, revoking it for everyone when Telegram permits. This is destructive and requires explicit confirmation.", inputSchema: { chat_id: z.number().int(), message_id: z.number().int().positive() }, annotations: { readOnlyHint: false, destructiveHint: true } }, async ({ chat_id, message_id }) => safely("telegram_delete_own_message", () => telegram.deleteOwnMessage(chat_id, message_id)));
}
