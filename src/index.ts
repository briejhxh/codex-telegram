import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TelegramClient } from "./telegram/client.js";
import { log } from "./utils/logger.js";
import { registerDownloadFile } from "./tools/downloadFile.js";
import { registerGetChat } from "./tools/getChat.js";
import { registerClickInlineButton, registerGetInlineButtons } from "./tools/inlineButtons.js";
import { registerGetMe } from "./tools/getMe.js";
import { registerGetMessages } from "./tools/getMessages.js";
import { registerGetUnread } from "./tools/getUnread.js";
import { registerListChats } from "./tools/listChats.js";
import { registerReplyMessage } from "./tools/replyMessage.js";
import { registerReactMessage } from "./tools/reactMessage.js";
import { registerSearchChats } from "./tools/searchChats.js";
import { registerSearchMedia } from "./tools/searchMedia.js";
import { registerSearchMessages } from "./tools/searchMessages.js";
import { registerSendFile } from "./tools/sendFile.js";
import { registerSendMessage } from "./tools/sendMessage.js";

const telegram = new TelegramClient();
const server = new McpServer({ name: "codex-telegram", version: "0.1.0" });
const context = { telegram };

registerGetMe(server, context);
registerListChats(server, context);
registerGetChat(server, context);
registerSearchChats(server, context);
registerGetMessages(server, context);
registerSearchMessages(server, context);
registerSearchMedia(server, context);
registerGetUnread(server, context);
registerGetInlineButtons(server, context);
registerClickInlineButton(server, context);
registerReactMessage(server, context);
registerSendMessage(server, context);
registerReplyMessage(server, context);
registerSendFile(server, context);
registerDownloadFile(server, context);

async function shutdown(signal: string) {
  log.info("MCP server stopping", { signal });
  await telegram.close();
  process.exit(0);
}
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

await server.connect(new StdioServerTransport());
log.info("MCP server started");
