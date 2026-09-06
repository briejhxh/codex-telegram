import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";

export function registerReactMessage(server: McpServer, { telegram, policy }: ToolContext) {
  server.registerTool("telegram_react_to_message", { description: "Add or remove your emoji reaction on one Telegram message. This changes external state and requires a local policy that permits low-risk writes.", inputSchema: { chat_id: z.number().int(), message_id: z.number().int().positive(), emoji: z.string().trim().min(1).max(16), remove: z.boolean().optional() }, annotations: { readOnlyHint: false, destructiveHint: false } }, async ({ chat_id, message_id, emoji, remove }) => safely("telegram_react_to_message", async () => { policy.authorize("telegram_react_to_message", "low-risk-write", { chatId: chat_id }); return telegram.reactToMessage(chat_id, message_id, emoji, remove === true); }));
}
