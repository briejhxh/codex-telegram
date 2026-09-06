import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";

export function registerGetInlineButtons(server: McpServer, { telegram }: ToolContext) {
  server.registerTool("telegram_get_inline_buttons", { description: "List the inline buttons attached to one Telegram message. Use row and column values from this result with telegram_click_inline_button.", inputSchema: { chat_id: z.number().int(), message_id: z.number().int().positive() }, annotations: { readOnlyHint: true } }, async ({ chat_id, message_id }) => safely("telegram_get_inline_buttons", () => telegram.getInlineButtons(chat_id, message_id)));
}

export function registerClickInlineButton(server: McpServer, { telegram, policy }: ToolContext) {
  server.registerTool("telegram_click_inline_button", { description: "Press a Telegram bot inline callback button by row and column. This sends a callback query and may change bot state. The server policy must permit writes. Callback buttons only; payments, URL/login, web-app, game, and password buttons are blocked.", inputSchema: { chat_id: z.number().int(), message_id: z.number().int().positive(), row: z.number().int().min(0), column: z.number().int().min(0) }, annotations: { readOnlyHint: false, destructiveHint: false } }, async ({ chat_id, message_id, row, column }) => safely("telegram_click_inline_button", async () => { policy.authorize("telegram_click_inline_button", "write", { chatId: chat_id }); return telegram.clickInlineButton(chat_id, message_id, row, column); }));
}
