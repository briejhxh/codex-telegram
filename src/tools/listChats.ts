import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { boundedLimit, LIMITS } from "../config.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";
import { cursorContext, decodeCursor, encodeCursor, page } from "../telegram/pagination.js";

export function registerListChats(server: McpServer, { telegram }: ToolContext) {
  server.registerTool("telegram_list_chats", { description: "List a bounded page of recent chats.", inputSchema: { account: z.string().optional(), limit: z.number().int().min(1).max(LIMITS.chats).optional(), cursor: z.string().max(4096).optional() }, annotations: { readOnlyHint: true } }, async ({ limit, cursor, account }) => safely("telegram_list_chats", async () => { const size = boundedLimit(limit, 30, LIMITS.chats); const profile = account ?? "default"; const context = cursorContext({}); const offset = cursor ? decodeCursor(cursor, { account: profile, operation: "telegram_list_chats", context }).state.offset ?? 0 : 0; const result = page(await telegram.listChats(LIMITS.chats), size, offset, (next) => encodeCursor({ account: profile, operation: "telegram_list_chats", context, state: { offset: next } })); return { ...result, items: await Promise.all(result.items.map((chat) => telegram.displayChat(chat))) }; }));
}
