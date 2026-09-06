import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { boundedLimit, LIMITS } from "../config.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";

export function registerListChats(server: McpServer, { telegram }: ToolContext) {
  server.registerTool("telegram_list_chats", { description: "List recent Telegram chats, groups, channels, and Saved Messages. Use search when the user names a person or a chat.", inputSchema: { limit: z.number().int().min(1).max(LIMITS.chats).optional().describe("Number of chats (default 30, max 100)") }, annotations: { readOnlyHint: true } }, async ({ limit }) => safely("telegram_list_chats", async () => Promise.all((await telegram.listChats(boundedLimit(limit, 30, LIMITS.chats))).map((chat) => telegram.displayChat(chat)))));
}
