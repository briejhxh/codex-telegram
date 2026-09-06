import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";

export function registerSendFile(server: McpServer, { telegram, policy }: ToolContext) {
  server.registerTool("telegram_send_file", { description: "Send a local file through the personal Telegram account. The file must be inside a configured TG_FILE_ROOTS directory, under the send-size limit, and explicitly confirmed with its recipient and caption.", inputSchema: { chat_id: z.number().int(), file_path: z.string().trim().min(1), caption: z.string().max(1024).optional() }, annotations: { readOnlyHint: false, destructiveHint: false } }, async ({ chat_id, file_path, caption }) => safely("telegram_send_file", async () => { policy.authorize("telegram_send_file", "write", { chatId: chat_id }); const safePath = await policy.authorizeFile(file_path); return telegram.displayMessage(await telegram.sendFile(chat_id, safePath, caption)); }));
}
