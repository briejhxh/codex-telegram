import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";

export function registerSendFile(server: McpServer, { telegram }: ToolContext) {
  server.registerTool("telegram_send_file", { description: "Send a local file through the personal Telegram account. This changes external state: call only after the user explicitly confirms recipient, file, and caption.", inputSchema: { chat_id: z.number().int(), file_path: z.string().trim().min(1), caption: z.string().max(1024).optional() }, annotations: { readOnlyHint: false, destructiveHint: false } }, async ({ chat_id, file_path, caption }) => safely("telegram_send_file", async () => telegram.displayMessage(await telegram.sendFile(chat_id, file_path, caption))));
}
