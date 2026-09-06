import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { boundedLimit, LIMITS } from "../config.js";
import { mediaKinds } from "../telegram/media.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";
import { cursorContext, decodeCursor, encodeCursor, page } from "../telegram/pagination.js";

export function registerSearchMedia(server: McpServer, { telegram }: ToolContext) {
  server.registerTool("telegram_search_media", { description: "Find a bounded page of media messages inside one known chat.", inputSchema: { account: z.string().optional(), chat_id: z.number().int(), kind: z.enum(mediaKinds), query: z.string().trim().max(256).optional(), limit: z.number().int().min(1).max(LIMITS.search).optional(), cursor: z.string().max(4096).optional() }, annotations: { readOnlyHint: true } }, async ({ chat_id, kind, query, limit, cursor, account }) => safely("telegram_search_media", async () => { const size = boundedLimit(limit, 30, LIMITS.search); const profile = account ?? "default"; const context = cursorContext({ chat_id, kind, query: query?.trim() ?? "" }); const offset = cursor ? decodeCursor(cursor, { account: profile, operation: "telegram_search_media", context }).state.offset ?? 0 : 0; const result = page(await telegram.searchMedia(chat_id, kind, LIMITS.search, query), size, offset, (next) => encodeCursor({ account: profile, operation: "telegram_search_media", context, state: { offset: next } })); return { ...result, items: await Promise.all(result.items.map((message) => telegram.displayMessage(message))) }; }));
}
