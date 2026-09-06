import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { boundedLimit, LIMITS } from "../config.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";
import { cursorContext, decodeCursor, encodeCursor, page } from "../telegram/pagination.js";

export function registerSearchMessages(server: McpServer, { telegram }: ToolContext) {
  server.registerTool("telegram_search_messages", { description: "Search a bounded page of Telegram message text.", inputSchema: { account: z.string().optional(), query: z.string().trim().min(1).max(256), chat_id: z.number().int().optional(), limit: z.number().int().min(1).max(LIMITS.search).optional(), cursor: z.string().max(4096).optional() }, annotations: { readOnlyHint: true } }, async ({ query, chat_id, limit, cursor, account }) => safely("telegram_search_messages", async () => { const size = boundedLimit(limit, 50, LIMITS.search); const profile = account ?? "default"; const context = cursorContext({ query: query.trim(), chat_id }); const offset = cursor ? decodeCursor(cursor, { account: profile, operation: "telegram_search_messages", context }).state.offset ?? 0 : 0; const result = page(await telegram.searchMessages(query, LIMITS.search, chat_id), size, offset, (next) => encodeCursor({ account: profile, operation: "telegram_search_messages", context, state: { offset: next } })); return { ...result, items: await Promise.all(result.items.map((message) => telegram.displayMessage(message))) }; }));
}
