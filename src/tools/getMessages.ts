import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { boundedLimit, LIMITS } from "../config.js";
import { cursorContext, decodeCursor, encodeCursor, page } from "../telegram/pagination.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";

export function registerGetMessages(server: McpServer, { telegram }: ToolContext) {
  server.registerTool("telegram_get_messages", { description: "Read a bounded page of messages in a known Telegram chat.", inputSchema: { account: z.string().optional(), chat_id: z.number().int(), limit: z.number().int().min(1).max(LIMITS.messages).optional(), cursor: z.string().min(1).max(4096).optional(), from_message_id: z.number().int().positive().optional() }, annotations: { readOnlyHint: true } }, async ({ chat_id, limit, cursor, from_message_id, account }) => safely("telegram_get_messages", async () => {
    if (cursor && from_message_id) throw new Error("cursor and from_message_id cannot be used together.");
    const pageSize = boundedLimit(limit, 50, LIMITS.messages); const profile = account ?? "default"; const context = cursorContext({ chat_id });
    const before = cursor ? decodeCursor(cursor, { account: profile, operation: "telegram_get_messages", context }).state.before : from_message_id;
    const source = await telegram.messages(chat_id, pageSize + 1, before);
    const result = page(source, pageSize, 0, (next) => encodeCursor({ account: profile, operation: "telegram_get_messages", context, state: { before: Number(source[next - 1]?.id) } }));
    return { ...result, items: await Promise.all(result.items.map((message) => telegram.displayMessage(message))) };
  }));
}
