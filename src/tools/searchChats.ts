import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { boundedLimit, LIMITS } from "../config.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";

export function registerSearchChats(server: McpServer, { telegram }: ToolContext) {
  server.registerTool("telegram_search_chats", { description: "Find people, groups, channels, or Saved Messages by name, username, or title. Private-chat results include the contact's Telegram user_id where available. Before sending to an ambiguous name, search and confirm the intended chat.", inputSchema: { query: z.string().trim().min(1).max(256), limit: z.number().int().min(1).max(LIMITS.search).optional() }, annotations: { readOnlyHint: true } }, async ({ query, limit }) => safely("telegram_search_chats", async () => Promise.all((await telegram.searchChats(query, boundedLimit(limit, 30, LIMITS.search))).map((chat) => telegram.displayChat(chat)))));
}
