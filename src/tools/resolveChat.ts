import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { boundedLimit, LIMITS } from "../config.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";

export function registerResolveChat(server: McpServer, { telegram }: ToolContext) {
  server.registerTool("telegram_resolve_chat", { description: "Resolve a person, group, channel, or @username into candidate chat IDs for later read tools. This never sends a message.", inputSchema: { query: z.string().trim().min(1).max(256), limit: z.number().int().min(1).max(LIMITS.search).optional() }, annotations: { readOnlyHint: true } }, async ({ query, limit }) => safely("telegram_resolve_chat", async () => {
    const normalized = query.replace(/^@/, "").toLocaleLowerCase();
    const chats = await Promise.all((await telegram.searchChats(query, boundedLimit(limit, 10, LIMITS.search))).map((chat) => telegram.displayChat(chat)));
    return chats.map((chat) => ({ ...chat, is_exact_match: [chat.title, chat.username, [chat.first_name, chat.last_name].filter(Boolean).join(" ")].filter((value): value is string => Boolean(value)).some((value) => value.replace(/^@/, "").toLocaleLowerCase() === normalized) }));
  }));
}
