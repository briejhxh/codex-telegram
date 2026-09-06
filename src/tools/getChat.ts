import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";

export function registerGetChat(server: McpServer, { telegram }: ToolContext) {
  server.registerTool("telegram_get_chat", { description: "Get details for one Telegram chat by its exact chat_id. For a private chat, returns the other person's Telegram user_id and profile fields when Telegram makes them available.", inputSchema: { chat_id: z.number().int() }, annotations: { readOnlyHint: true } }, async ({ chat_id }) => safely("telegram_get_chat", async () => telegram.displayChat(await telegram.getChat(chat_id))));
}
