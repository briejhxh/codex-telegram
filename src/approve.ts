import { createApproval } from "./security/approval.js";
import { activeAccount } from "./config.js";

const [tool, chatIdValue, messageIdValue] = process.argv.slice(2);
const secret = process.env.TG_DESTRUCTIVE_APPROVAL_SECRET?.trim();
if (tool !== "telegram_delete_own_message" || !/^[-]?\d+$/.test(chatIdValue ?? "") || !/^\d+$/.test(messageIdValue ?? "")) {
  throw new Error("Usage: pnpm run approve telegram_delete_own_message <chat_id> <message_id>");
}
if (!secret) throw new Error("TG_DESTRUCTIVE_APPROVAL_SECRET is required and must remain private.");
const ttlSeconds = Number(process.env.TG_DESTRUCTIVE_APPROVAL_TTL_SECONDS ?? 120);
if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 30 || ttlSeconds > 600) throw new Error("TG_DESTRUCTIVE_APPROVAL_TTL_SECONDS must be between 30 and 600.");
const token = createApproval(secret, { tool, account: activeAccount, chatId: Number(chatIdValue), material: { message_id: Number(messageIdValue) }, expiresAt: Date.now() + ttlSeconds * 1_000 });
console.error("One-time destructive approval token (do not paste into Telegram or source control):");
console.log(token);
