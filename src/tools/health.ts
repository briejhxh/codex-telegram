import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";

export function registerHealth(server: McpServer, { telegram, policy }: ToolContext) {
  server.registerTool("telegram_health", { description: "Diagnose local Telegram plugin setup and active server-side policy without exposing credentials or message data. Optionally verifies the saved TDLib session.", inputSchema: { check_connection: z.boolean().optional().describe("Connect to TDLib and verify the saved Telegram session; defaults to true.") }, annotations: { readOnlyHint: true } }, async ({ check_connection }) => safely("telegram_health", async () => ({ ...(await telegram.health(check_connection !== false)), policy: policy.describe() })));
}
