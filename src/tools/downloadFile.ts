import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";

export function registerDownloadFile(server: McpServer, context: ToolContext) {
  const { telegram, policy } = context;
  server.registerTool("telegram_download_file", { description: "Download media attached to one Telegram message. This writes locally and requires a server-side files policy. destination, when supplied, must be a new file name only; it is saved inside the configured Telegram downloads directory and never overwrites an existing file.", inputSchema: { chat_id: z.number().int(), message_id: z.number().int().positive(), destination: z.string().trim().min(1).optional() }, annotations: { readOnlyHint: false, destructiveHint: false } }, async ({ chat_id, message_id, destination }) => safely("telegram_download_file", () => { policy.authorize("telegram_download_file", "write", { chatId: chat_id }); return telegram.downloadFile(chat_id, message_id, destination); }));
}
