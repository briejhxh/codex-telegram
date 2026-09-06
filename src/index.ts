import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AccountManager } from "./accounts/manager.js";
import { AccountRouter } from "./accounts/router.js";
import { z } from "zod";
import { log } from "./utils/logger.js";
import { registerDownloadFile } from "./tools/downloadFile.js";
import { registerGetChat } from "./tools/getChat.js";
import { registerHealth } from "./tools/health.js";
import { registerGetPinnedMessage } from "./tools/getPinnedMessage.js";
import { registerClickInlineButton, registerGetInlineButtons } from "./tools/inlineButtons.js";
import { registerGetMe } from "./tools/getMe.js";
import { registerGetMessages } from "./tools/getMessages.js";
import { registerGetUnread } from "./tools/getUnread.js";
import { registerListChats } from "./tools/listChats.js";
import { registerReplyMessage } from "./tools/replyMessage.js";
import { registerReactMessage } from "./tools/reactMessage.js";
import { registerSearchChats } from "./tools/searchChats.js";
import { registerResolveChat } from "./tools/resolveChat.js";
import { registerSearchMedia } from "./tools/searchMedia.js";
import { registerSearchMessages } from "./tools/searchMessages.js";
import { registerSendFile } from "./tools/sendFile.js";
import { registerSendMessage } from "./tools/sendMessage.js";
import { registerManageMessage } from "./tools/manageMessage.js";

const accounts = new AccountManager();
const router = new AccountRouter(accounts);
const server = new McpServer({ name: "codex-telegram", version: "0.2.0" });
const rawRegisterTool = server.registerTool.bind(server);
// One centralized MCP boundary: every tool accepts an optional account and runs
// under an AsyncLocalStorage account scope. Existing single-account calls work.
(server as unknown as { registerTool: (...args: any[]) => unknown }).registerTool = (name: string, definition: any, handler: any) => (rawRegisterTool as any)(name, { ...definition, inputSchema: { ...definition.inputSchema, account: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,31}$/i).optional().describe("Telegram account profile; required when multiple accounts are configured.") } }, (args: { account?: string }) => router.run(args.account, () => handler(args)));
const context = { accounts, telegram: router.telegram, policy: router.policy };

registerGetMe(server, context);
registerHealth(server, context);
registerListChats(server, context);
registerGetChat(server, context);
registerGetPinnedMessage(server, context);
registerSearchChats(server, context);
registerResolveChat(server, context);
registerGetMessages(server, context);
registerSearchMessages(server, context);
registerSearchMedia(server, context);
registerGetUnread(server, context);
registerGetInlineButtons(server, context);
registerClickInlineButton(server, context);
registerReactMessage(server, context);
registerManageMessage(server, context);
registerSendMessage(server, context);
registerReplyMessage(server, context);
registerSendFile(server, context);
registerDownloadFile(server, context);

async function shutdown(signal: string) {
  log.info("MCP server stopping", { signal });
  await accounts.close();
  process.exit(0);
}
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

await server.connect(new StdioServerTransport());
log.info("MCP server started");
