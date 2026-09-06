import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { boundedLimit, LIMITS } from "../config.js";
import { mediaKinds } from "../telegram/media.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";

export function registerSearchMedia(server: McpServer, { telegram }: ToolContext) {
  server.registerTool("telegram_search_media", { description: "Find recent photos, videos, documents, audio, voice notes, animations, or URL messages inside one known chat. Returns message metadata only; no media is downloaded automatically.", inputSchema: { chat_id: z.number().int(), kind: z.enum(mediaKinds), query: z.string().trim().max(256).optional(), limit: z.number().int().min(1).max(LIMITS.search).optional() }, annotations: { readOnlyHint: true } }, async ({ chat_id, kind, query, limit }) => safely("telegram_search_media", async () => Promise.all((await telegram.searchMedia(chat_id, kind, boundedLimit(limit, 30, LIMITS.search), query)).map((message) => telegram.displayMessage(message)))));
}
