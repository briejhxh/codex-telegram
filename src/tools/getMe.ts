import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./common.js";
import { safely } from "./common.js";
import { num, str } from "../telegram/helpers.js";

export function registerGetMe(server: McpServer, { telegram }: ToolContext) {
  server.registerTool("telegram_get_me", { description: "Get the authenticated personal Telegram account. The phone number is intentionally omitted for privacy.", annotations: { readOnlyHint: true } }, async () => safely("telegram_get_me", async () => {
    const me = await telegram.getMe(); return { id: num(me.id), first_name: str(me.first_name), last_name: str(me.last_name), username: str(me.usernames && typeof me.usernames === "object" ? (me.usernames as Record<string, unknown>).editable_username : undefined) };
  }));
}
