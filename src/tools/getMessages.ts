import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { boundedLimit, LIMITS } from "../config.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";

export function registerGetMessages(server: McpServer, { telegram }: ToolContext) {
  server.registerTool("telegram_get_messages", { description: "Read up to 100 messages in a known Telegram chat. The tool keeps requesting TDLib history internally when TDLib returns a partial page. Returns text and metadata only; media is not downloaded automatically.", inputSchema: { chat_id: z.number().int(), limit: z.number().int().min(1).max(LIMITS.messages).optional(), from_message_id: z.number().int().positive().optional().describe("Start before this message ID for older history") }, annotations: { readOnlyHint: true } }, async ({ chat_id, limit, from_message_id }) => safely("telegram_get_messages", async () => Promise.all((await telegram.messages(chat_id, boundedLimit(limit, 50, LIMITS.messages), from_message_id)).map((message) => telegram.displayMessage(message)))));
}
