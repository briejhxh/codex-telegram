import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { boundedLimit, LIMITS } from "../config.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";

export function registerGetUnread(server: McpServer, { telegram }: ToolContext) {
  server.registerTool("telegram_get_unread", { description: "List recent Telegram chats that have unread messages.", inputSchema: { limit: z.number().int().min(1).max(LIMITS.chats).optional() }, annotations: { readOnlyHint: true } }, async ({ limit }) => safely("telegram_get_unread", async () => {
    const chats = await telegram.listChats(boundedLimit(limit, 30, LIMITS.chats)); const displayed = await Promise.all(chats.map((chat) => telegram.displayChat(chat))); return displayed.filter((chat) => chat.unread_count > 0);
  }));
}
