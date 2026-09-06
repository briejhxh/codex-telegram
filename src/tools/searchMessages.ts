import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { boundedLimit, LIMITS } from "../config.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";

export function registerSearchMessages(server: McpServer, { telegram }: ToolContext) {
  server.registerTool("telegram_search_messages", { description: "Search Telegram message text globally, or inside a supplied chat_id. Use this to locate a topic, deadline, specification, or file discussion.", inputSchema: { query: z.string().trim().min(1).max(256), chat_id: z.number().int().optional(), limit: z.number().int().min(1).max(LIMITS.search).optional() }, annotations: { readOnlyHint: true } }, async ({ query, chat_id, limit }) => safely("telegram_search_messages", async () => Promise.all((await telegram.searchMessages(query, boundedLimit(limit, 50, LIMITS.search), chat_id)).map((message) => telegram.displayMessage(message)))));
}
