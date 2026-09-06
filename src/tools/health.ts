import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";

export function registerHealth(server: McpServer, { telegram }: ToolContext) {
  server.registerTool("telegram_health", { description: "Diagnose local Telegram plugin setup without exposing credentials or message data. Optionally verifies the saved TDLib session.", inputSchema: { check_connection: z.boolean().optional().describe("Connect to TDLib and verify the saved Telegram session; defaults to true.") }, annotations: { readOnlyHint: true } }, async ({ check_connection }) => safely("telegram_health", () => telegram.health(check_connection !== false)));
}
